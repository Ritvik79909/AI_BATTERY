package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.ChargingHabitSummary;
import com.ev.AI_battery.dto.ChargingOptimizationRecommendation;
import com.ev.AI_battery.dto.HealthScoreResponse;
import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChargingOptimizationService {

    private final ChargingHabitService habitService;
    private final BatteryHealthService healthService;
    private final OptimizationRepository repo;

    public ChargingOptimizationRecommendation getRecommendations(Vehicle vehicle) {
        try {
            HealthScoreResponse health = healthService.getScore(vehicle);
            ChargingHabitSummary habits = habitService.analyzeHabits(vehicle);

            int chargeLimit = calculateOptimalChargeLimit(habits, health);
            String chargeTime = calculateOptimalChargeTime();
            String fastRec = getFastChargingRecommendation(habits);
            String freqRec = getFrequencyRecommendation(habits);
            String priority = getOptimizationPriority(health, habits);
            double lifespanExt = estimateLifespanExtension(habits, health);
            List<String> explanation = generateExplanation(habits, health);

            ChargingOptimization opt = new ChargingOptimization();
            opt.setVehicle(vehicle);
            opt.setRecommendedChargeLimit(chargeLimit);
            opt.setRecommendedChargingTime(chargeTime);
            opt.setFastChargingRecommendation(fastRec);
            opt.setChargingFrequencyRecommendation(freqRec);
            opt.setOptimizationPriority(priority);
            opt.setEstimatedLifespanExtension(lifespanExt);
            opt.setRecommendationTimestamp(LocalDateTime.now());
            repo.save(opt);

            return new ChargingOptimizationRecommendation(
                    chargeLimit, chargeTime, fastRec, freqRec, priority, explanation, lifespanExt
            );
        } catch (Exception e) {
            log.error("Optimization failed for vehicle {}", vehicle.getId(), e);
            return fallbackRecommendation();
        }
    }

    private int calculateOptimalChargeLimit(ChargingHabitSummary habits, HealthScoreResponse health) {
        if (habits.getAverageChargeDepth() > 85 || health.getHealthScore() < 80) return 80;
        return 90;
    }

    private String calculateOptimalChargeTime() {
        return "Night (10 PM - 6 AM) or Early Morning";
    }

    private String getFastChargingRecommendation(ChargingHabitSummary habits) {
        if (habits.getFastChargingPercentage() > 30) {
            return "Reduce fast charging (use slow charging when possible)";
        }
        return "Fast charging usage is healthy";
    }

    private String getFrequencyRecommendation(ChargingHabitSummary habits) {
        if (habits.getChargingFrequencyPerWeek() > 7) {
            return "Charge every 2-3 days instead of daily";
        }
        return "Charging frequency is optimal";
    }

    private String getOptimizationPriority(HealthScoreResponse health, ChargingHabitSummary habits) {
        if (health.getHealthScore() < 75 || habits.getHabitScore() < 70) return "HIGH";
        return "MEDIUM";
    }

    private double estimateLifespanExtension(ChargingHabitSummary habits, HealthScoreResponse health) {
        double baseImprovement = 100 - habits.getHabitScore();
        return Math.round(baseImprovement * 0.2 * 10) / 10.0;
    }

    private List<String> generateExplanation(ChargingHabitSummary habits, HealthScoreResponse health) {
        List<String> explanation = new ArrayList<>();
        explanation.add("Based on " + habits.getFastChargingPercentage() + "% fast charging");
        if (health.getHealthScore() < 85) {
            explanation.add("Low health score triggers conservative recommendations");
        }
        return explanation;
    }

    private ChargingOptimizationRecommendation fallbackRecommendation() {
        return new ChargingOptimizationRecommendation(
                80, "Night hours", "Reduce fast charging", "Charge every 2 days",
                "MEDIUM", Arrays.asList("Default recommendations"), 15.0
        );
    }
}
