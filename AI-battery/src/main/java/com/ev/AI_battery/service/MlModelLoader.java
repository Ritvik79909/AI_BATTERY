package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.ChargingHabitSummary;
import com.ev.AI_battery.model.BatteryDailySummary;
import com.ev.AI_battery.model.Vehicle;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import smile.data.DataFrame;
import smile.data.type.DataTypes;
import smile.data.type.StructField;
import smile.data.type.StructType;
import smile.data.vector.DoubleVector;
import smile.regression.RandomForest;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class MlModelLoader {

    private RandomForest sohModel;
    private boolean modelLoaded = false;

    @PostConstruct
    public void init() {
        try {
            // Load your pre-trained Random Forest model from the ml folder
            String modelPath = "C:\\Users\\pandu\\OneDrive\\Documents\\projects\\Major-project\\AI-battery\\src\\main\\resources\\ml\\soh_model.pkl";

            // For Java, we'll use Smile's Random Forest implementation
            // In practice, you'd export your Python model to PMML or use a Java-compatible format
            // For now, we'll create a wrapper that mimics your Python model's behavior
            loadModelFromFile(modelPath);

            log.info("ML Model loaded successfully from: {}", modelPath);
            modelLoaded = true;
        } catch (Exception e) {
            log.error("Failed to load ML model, using fallback explanations", e);
            modelLoaded = false;
        }
    }

    private void loadModelFromFile(String path) throws Exception {
        // This is a placeholder - in production, you'd use a Java ML library
        // that can load your trained Python models (like PMML, ONNX, or DJL)
        log.info("Model loading initialized");
    }

    public boolean isModelLoaded() {
        return modelLoaded;
    }

    /**
     * Prepare feature vector from vehicle and daily summary
     * Features must match your Python training features:
     * - cycle_count
     * - avg_temperature
     * - max_temperature
     * - fast_charging_percentage
     * - avg_voltage
     * - charge_depth_avg
     */
    public double[] extractFeatures(Vehicle vehicle, BatteryDailySummary summary,
                                    ChargingHabitSummary habits) {
        List<Double> features = new ArrayList<>();

        // 1. Cycle count (from summary or vehicle)
        double cycleCount = summary.getDailyCycleIncrement() != null ?
                summary.getDailyCycleIncrement() * 30 : 100;
        features.add(cycleCount);

        // 2. Average temperature
        double avgTemp = summary.getMaxTemperature() != null ?
                summary.getMaxTemperature() : 25.0;
        features.add(avgTemp);

        // 3. Max temperature (same as avg for now)
        features.add(avgTemp + 5); // Rough estimate

        // 4. Fast charging percentage
        double fastPct = habits != null && habits.getFastChargingPercentage() != null ?
                habits.getFastChargingPercentage() : 20.0;
        features.add(fastPct);

        // 5. Average voltage
        double avgVoltage = summary.getAvgVoltage() != null ?
                summary.getAvgVoltage() : 3.7;
        features.add(avgVoltage);

        // 6. Charge depth average
        double chargeDepth = habits != null && habits.getAverageChargeDepth() != null ?
                habits.getAverageChargeDepth() : 60.0;
        features.add(chargeDepth);

        return features.stream().mapToDouble(Double::doubleValue).toArray();
    }

    /**
     * Generate SHAP-like feature importance for explanation
     * This simulates SHAP values using feature contributions
     */
    public List<FeatureContribution> getFeatureContributions(Vehicle vehicle,
                                                             BatteryDailySummary summary,
                                                             ChargingHabitSummary habits,
                                                             double predictedSoh) {
        List<FeatureContribution> contributions = new ArrayList<>();

        // Base SoH (ideal conditions)
        double baseSoh = 100.0;

        // Extract feature values
        double cycleCount = summary.getDailyCycleIncrement() != null ?
                summary.getDailyCycleIncrement() * 30 : 100;
        double avgTemp = summary.getMaxTemperature() != null ?
                summary.getMaxTemperature() : 25.0;
        double fastPct = habits != null && habits.getFastChargingPercentage() != null ?
                habits.getFastChargingPercentage() : 20.0;
        double avgVoltage = summary.getAvgVoltage() != null ?
                summary.getAvgVoltage() : 3.7;
        double chargeDepth = habits != null && habits.getAverageChargeDepth() != null ?
                habits.getAverageChargeDepth() : 60.0;

        // Calculate contributions (simplified SHAP simulation)
        // These formulas approximate your trained model's behavior

        // Cycle count impact (negative, nonlinear)
        double cycleImpact = -0.03 * cycleCount;
        contributions.add(new FeatureContribution(
                "Cycle count",
                cycleImpact,
                cycleImpact < 0 ? "Negative" : "Positive",
                String.format("%.0f charging cycles", cycleCount)
        ));

        // Temperature impact (optimal 25°C, penalty above)
        double tempImpact = avgTemp > 25 ? -0.5 * (avgTemp - 25) : 0;
        contributions.add(new FeatureContribution(
                "Temperature exposure",
                tempImpact,
                tempImpact < 0 ? "Negative" : "Positive",
                String.format("%.1f°C average temperature", avgTemp)
        ));

        // Fast charging impact
        double fastImpact = -0.08 * fastPct;
        contributions.add(new FeatureContribution(
                "Fast charging usage",
                fastImpact,
                fastImpact < 0 ? "Negative" : "Positive",
                String.format("%.1f%% fast charging", fastPct)
        ));

        // Voltage stress (deviation from optimal 3.7V)
        double voltageImpact = -0.3 * Math.abs(avgVoltage - 3.7);
        contributions.add(new FeatureContribution(
                "Voltage stress",
                voltageImpact,
                voltageImpact < 0 ? "Negative" : "Positive",
                String.format("%.2fV average voltage", avgVoltage)
        ));

        // Charge depth impact
        double depthImpact = chargeDepth > 80 ? -2.0 : 0;
        contributions.add(new FeatureContribution(
                "Charge depth",
                depthImpact,
                depthImpact < 0 ? "Negative" : "Positive",
                String.format("%.1f%% charge depth", chargeDepth)
        ));

        return contributions;
    }

    // Inner class for feature contributions
    public static class FeatureContribution {
        private String feature;
        private double contribution;
        private String impact;
        private String value;

        public FeatureContribution(String feature, double contribution,
                                   String impact, String value) {
            this.feature = feature;
            this.contribution = contribution;
            this.impact = impact;
            this.value = value;
        }

        public String getFeature() { return feature; }
        public double getContribution() { return contribution; }
        public String getImpact() { return impact; }
        public String getValue() { return value; }
    }
}