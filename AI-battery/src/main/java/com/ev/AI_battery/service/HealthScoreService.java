package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.ChargingSummary;
import com.ev.AI_battery.dto.HealthScoreResponse;
import com.ev.AI_battery.dto.SimulatedHealthResponse;
import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthScoreService {

    private final BatteryMlService mlService;
    private final BatteryDailySummaryRepository dailyRepo;
    private final ChargingSessionRepository sessionRepo;
    private final HealthScoreRepository scoreRepo;

    public HealthScoreResponse calculateScore(Vehicle vehicle) {
        BatteryDailySummary latest = getLatestSummaryOrDefault(vehicle);
        SimulatedHealthResponse ml = mlService.predict(vehicle, latest);

        ChargingSummary charging = getChargingSummary(vehicle);

        double finalScore = calculateWeightedScore(ml, latest, charging);

        storeHealthScore(vehicle, finalScore, ml, charging);

        return new HealthScoreResponse(
                (int) Math.round(finalScore),
                getScoreLabel(finalScore)
        );
    }

    private double calculateWeightedScore(SimulatedHealthResponse ml,
                                          BatteryDailySummary summary,
                                          ChargingSummary charging) {

        double sohScore = ml.getSoh();
        double rulScore = (ml.getRulCycles() / 1000.0) * 100;
        double tempScore = tempHealthScore(summary.getMaxTemperature());
        double chargeScore = 100 - (charging.getFastChargingPercentage() * 0.5);
        double cycleScore = cycleHealthScore(summary.getDailyCycleIncrement());

        double healthScore =
                (0.40 * sohScore) +
                        (0.30 * rulScore) +
                        (0.15 * tempScore) +
                        (0.10 * chargeScore) +
                        (0.05 * cycleScore);

        return Math.max(0, Math.min(100, healthScore));
    }

    private double tempHealthScore(Double maxTemp) {
        if (maxTemp == null) return 90.0;
        if (maxTemp <= 30) return 100.0;
        if (maxTemp <= 40) return 80.0;
        return 60.0 - (maxTemp - 40) * 2;
    }

    private double cycleHealthScore(Integer cycles) {
        if (cycles == null || cycles <= 1) return 100.0;
        return Math.max(70.0, 100 - (cycles * 0.1));
    }

    private ChargingSummary getChargingSummary(Vehicle vehicle) {
        ChargingSummary summary = new ChargingSummary();
        summary.setFastChargingPercentage(25.0);
        return summary;
    }

    private void storeHealthScore(Vehicle vehicle, double score,
                                  SimulatedHealthResponse ml, ChargingSummary charging) {
        BatteryHealthScore scoreEntity = new BatteryHealthScore();
        scoreEntity.setVehicle(vehicle);
        scoreEntity.setHealthScore(score);
        scoreEntity.setSoh(ml.getSoh());
        scoreEntity.setRulCycles(ml.getRulCycles());
        scoreEntity.setTemperatureScore(tempHealthScore(null));
        scoreEntity.setChargingScore(100 - charging.getFastChargingPercentage() * 0.5);
        scoreEntity.setTimestamp(LocalDateTime.now());
        scoreRepo.save(scoreEntity);
    }

    private String getScoreLabel(double score) {
        if (score >= 90) return "Excellent";
        if (score >= 80) return "Good";
        if (score >= 70) return "Moderate";
        if (score >= 50) return "Fair";
        return "Critical";
    }

    private BatteryDailySummary getLatestSummaryOrDefault(Vehicle vehicle) {
        List<BatteryDailySummary> summaries = dailyRepo.findByVehicleOrderByDateDesc(vehicle);
        if (summaries.isEmpty()) {
            BatteryDailySummary mock = new BatteryDailySummary();
            mock.setMaxTemperature(25.0);
            mock.setDailyCycleIncrement(1);
            mock.setAvgVoltage(3.7);
            mock.setAvgSoc(75.0);
            return mock;
        }
        return summaries.get(0);
    }
}
