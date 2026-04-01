package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.SimulatedHealthResponse;
import com.ev.AI_battery.model.BatteryDailySummary;
import com.ev.AI_battery.model.Vehicle;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

/**
 * ML Service for battery health prediction using XGBoost model
 * 
 * Input format for XGBoost model:
 * [Voltage_measured, Current_measured, Temperature_measured, SoC, cycle_number]
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryMlService {

    private final XGBoostModelService xgboostService;

    /**
     * Predict battery health metrics using XGBoost model
     * 
     * @param vehicle The vehicle entity
     * @param summary Battery daily summary containing voltage, current, temp, SoC, cycles
     * @return SimulatedHealthResponse with predicted metrics
     */
    public SimulatedHealthResponse predict(Vehicle vehicle, BatteryDailySummary summary) {
        try {
            // Extract values from summary with defaults
            double voltage = summary.getAvgVoltage() != null ? summary.getAvgVoltage() : 3.7;
            double current = summary.getTotalChargeCurrent() != null ? summary.getTotalChargeCurrent() : -1.5;
            double temp = summary.getMaxTemperature() != null ? summary.getMaxTemperature() : 25.0;
            double soc = summary.getAvgSoc() != null ? summary.getAvgSoc() : 75.0;
            int cycles = summary.getDailyCycleIncrement() != null ? summary.getDailyCycleIncrement() : 100;

            // Normalize uploaded telemetry units to model feature ranges.
            voltage = normalizeVoltageForModel(voltage);
            current = normalizeCurrentForModel(current);
            temp = clamp(temp, -20.0, 60.0);
            soc = clamp(soc, 0.0, 100.0);
            cycles = Math.max(0, cycles);

            // Get XGBoost prediction
            // Input format: [Voltage_measured, Current_measured, Temperature_measured, SoC, cycle_number]
            double predictedSoH = xgboostService.predictSoH(voltage, current, temp, soc, cycles);

            // Calculate RUL based on predicted SoH
            int rulCycles = calculateRULCycles(predictedSoH);
            int estimatedMonths = rulCycles / 30;  // Rough conversion to months
            double degradationRate = (100.0 - predictedSoH) / Math.max(1, cycles);

            // Generate SoH trend
            List<Double> degradationTrend = generateTrend(cycles, predictedSoH);

            log.info("XGBoost Prediction: Vehicle={}, SoH={}%, RUL={} cycles, Degradation={}%/cycle",
                    vehicle.getId(), predictedSoH, rulCycles, String.format("%.3f", degradationRate));

            return new SimulatedHealthResponse(
                    (int) Math.round(predictedSoH * 0.95),  // healthScore (slightly conservative)
                    Math.round(predictedSoH * 10.0) / 10.0,  // soh
                    rulCycles,  // rulCycles
                    estimatedMonths,  // estimatedMonths
                    degradationTrend,  // degradationTrend
                    "XGBOOST_MODEL",  // source - real model, not fallback
                    degradationRate
            );

        } catch (Exception e) {
            log.error("ML Prediction failed for vehicle {}, using fallback", vehicle.getId(), e);
            return fallbackResponse();
        }
    }

    /**
     * Calculate Remaining Useful Life (RUL) in cycles based on predicted SoH
     * Assumes battery reaches end-of-life at 70% SoH
     */
    private int calculateRULCycles(double currentSoH) {
        final double END_OF_LIFE_SOH = 70.0;
        final int TOTAL_RATED_CYCLES = 1500;
        
        if (currentSoH <= END_OF_LIFE_SOH) {
            return 0;
        }
        
        // Simple linear extrapolation
        double degradation = 100.0 - currentSoH;
        double degradationRate = degradation / Math.max(1, TOTAL_RATED_CYCLES / 2);
        
        if (degradationRate <= 0) {
            return TOTAL_RATED_CYCLES;
        }
        
        double remainingDegradation = currentSoH - END_OF_LIFE_SOH;
        int remainingCycles = (int) Math.round(remainingDegradation / degradationRate);
        
        return Math.max(0, Math.min(remainingCycles, TOTAL_RATED_CYCLES));
    }

    /**
     * Generate SoH degradation trend for visualization
     */
    private List<Double> generateTrend(int cycles, double currentSoH) {
        double startSoh = 100.0;
        double totalDegradation = Math.max(0, startSoh - currentSoH);
        
        return Arrays.asList(
                startSoh,
                startSoh - (totalDegradation * 0.2),
                startSoh - (totalDegradation * 0.45),
                startSoh - (totalDegradation * 0.75),
                currentSoH
        );
    }

    /**
     * Fallback response when XGBoost model is unavailable
     */
    private SimulatedHealthResponse fallbackResponse() {
        return new SimulatedHealthResponse(
                88,  // healthScore
                88.5,  // soh
                650,  // rulCycles
                21,  // estimatedMonths
                Arrays.asList(100.0, 97.5, 94.0, 91.0, 88.5),  // degradationTrend
                "FALLBACK",  // source
                0.08  // degradationRate
        );
    }

    private double normalizeVoltageForModel(double voltage) {
        double v = voltage;

        // Common upload patterns: pack voltage (200-450V) or millivolts.
        if (v > 20.0 && v <= 500.0) {
            v = v / 100.0;
        } else if (v > 500.0) {
            v = v / 1000.0;
        }

        return clamp(v, 2.7, 4.2);
    }

    private double normalizeCurrentForModel(double current) {
        double c = current;

        // If current is in mA-like scale, reduce to A-like scale.
        if (Math.abs(c) > 100.0) {
            c = c / 1000.0;
        } else if (Math.abs(c) > 20.0) {
            c = c / 10.0;
        }

        return clamp(c, -5.0, 5.0);
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

}
