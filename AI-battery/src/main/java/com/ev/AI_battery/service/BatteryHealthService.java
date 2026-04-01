package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.*;
import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.BatteryDailySummaryRepository;
import com.ev.AI_battery.repository.PredictionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryHealthService {

    private final BatteryDailySummaryRepository dailyRepo;
    private final PredictionRepository predictionRepo;
    private final BatteryMlService mlService;
    private final SoHCalculator sohCalc;
    private final RULCalculator rulCalc;
    private final HealthScoreCalculator scoreCalc;

    private BatteryDailySummary getAveragedSummaryOrDefault(Vehicle vehicle) {
        List<BatteryDailySummary> summaries = dailyRepo.findByVehicleOrderByDateDesc(vehicle)
                .stream()
                .limit(7)
                .toList();

        if (summaries.isEmpty()) {
            log.warn("No summaries for vehicle {}. Using defaults.", vehicle.getId());
            BatteryDailySummary mock = new BatteryDailySummary();
            mock.setMaxTemperature(25.0);
            mock.setDailyCycleIncrement(100);
            mock.setAvgVoltage(3.7);
            mock.setAvgSoc(75.0);
            mock.setTotalChargeCurrent(-1.5);
            return mock;
        }

        BatteryDailySummary averaged = new BatteryDailySummary();
        averaged.setDate(summaries.stream()
                .map(BatteryDailySummary::getDate)
                .max(Comparator.naturalOrder())
                .orElse(null));
        averaged.setAvgSoc(avgDouble(summaries, BatteryDailySummary::getAvgSoc, 75.0));
        averaged.setMaxTemperature(avgDouble(summaries, BatteryDailySummary::getMaxTemperature, 25.0));
        averaged.setAvgVoltage(avgDouble(summaries, BatteryDailySummary::getAvgVoltage, 3.7));
        averaged.setTotalChargeCurrent(avgDouble(summaries, BatteryDailySummary::getTotalChargeCurrent, -1.5));
        averaged.setDailyCycleIncrement((int) Math.round(
                avgDouble(summaries, s -> s.getDailyCycleIncrement() != null ? s.getDailyCycleIncrement().doubleValue() : null, 100.0)
        ));

        return averaged;
    }

    public SoHResponse getSoH(Vehicle vehicle) {
        BatteryDailySummary latest = getAveragedSummaryOrDefault(vehicle);
        SimulatedHealthResponse mlResult = mlService.predict(vehicle, latest);

        storePrediction(vehicle, mlResult);

        return new SoHResponse(
                mlResult.getSoh(),
                getStatusLabel(mlResult.getSoh()),
                LocalDateTime.now()
        );
    }

    public RULResponse getRUL(Vehicle vehicle) {
        BatteryDailySummary latest = getAveragedSummaryOrDefault(vehicle);
        SimulatedHealthResponse mlResult = mlService.predict(vehicle, latest);

        storePrediction(vehicle, mlResult);

        return new RULResponse(
                mlResult.getRulCycles(),
                mlResult.getEstimatedMonths(),
                getRulConfidence(mlResult.getRulCycles())
        );
    }


    public HealthScoreResponse getScore(Vehicle vehicle) {
        BatteryDailySummary latest = getAveragedSummaryOrDefault(vehicle);
        SimulatedHealthResponse mlResult = mlService.predict(vehicle, latest);

        storePrediction(vehicle, mlResult);

        return new HealthScoreResponse(
                mlResult.getHealthScore(),
                getScoreLabel(mlResult.getHealthScore())
        );
    }

    public HealthScoreResponse calculateScore(Vehicle vehicle) {
        return getScore(vehicle);
    }

    private void storePrediction(Vehicle vehicle, SimulatedHealthResponse mlResult) {
        BatteryHealthPrediction pred = new BatteryHealthPrediction();
        pred.setVehicle(vehicle);
        pred.setSohValue(mlResult.getSoh());
        pred.setRulCycles(Double.valueOf(mlResult.getRulCycles()));
        pred.setEstimatedMonths(Double.valueOf(mlResult.getEstimatedMonths()));
        pred.setPredictionTimestamp(LocalDateTime.now());
        pred.setSource(mlResult.getSource());
        pred.setDegradationRate(mlResult.getDegradationRate());
        predictionRepo.save(pred);
    }

    private String getStatusLabel(double soh) {
        if (soh >= 90) return "Excellent";
        if (soh >= 80) return "Good";
        if (soh >= 70) return "Moderate";
        return "Critical";
    }

    private String getRulConfidence(Integer rulCycles) {
        if (rulCycles > 1000) return "High";
        if (rulCycles > 500) return "Medium";
        return "Low";
    }

    private String getScoreLabel(Integer score) {
        if (score >= 90) return "Excellent";
        if (score >= 80) return "Healthy";
        if (score >= 70) return "Moderate";
        return "Needs Attention";
    }

    private double avgDouble(List<BatteryDailySummary> summaries,
                             java.util.function.Function<BatteryDailySummary, Double> getter,
                             double fallback) {
        return summaries.stream()
                .map(getter)
                .filter(v -> v != null)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(fallback);
    }

    // Add this method to BatteryHealthService.java
    public Map<String, Object> getHealthSummary(Vehicle vehicle) {
        SoHResponse soh = getSoH(vehicle);
        RULResponse rul = getRUL(vehicle);
        HealthScoreResponse score = getScore(vehicle);

        Map<String, Object> summary = new HashMap<>();
        summary.put("soh", soh);
        summary.put("rul", rul);
        summary.put("score", score);
        return summary;
    }
}
