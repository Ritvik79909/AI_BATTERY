package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.ChargingHabitSummary;
import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChargingHabitService {

    private final ChargingSessionRepository sessionRepo;
    private final HabitAnalysisRepository analysisRepo;

    public ChargingHabitSummary analyzeHabits(Vehicle vehicle) {
        // Get last 30 days sessions
        List<ChargingSession> recent = sessionRepo
                .findByVehicleOrderByStartTimeDesc(vehicle)
                .stream()
                .limit(50)  // Recent 50 sessions
                .toList();

        if (recent.isEmpty()) {
            return emptyHabitSummary();
        }

        // DAY-17 Metrics
        double fastPct = calculateFastChargingPercentage(recent);
        double avgChargeDepth = calculateAverageChargeDepth(recent);
        double freqPerWeek = calculateFrequencyPerWeek(recent);
        double habitScore = calculateHabitScore(fastPct, avgChargeDepth, freqPerWeek);
        String riskLevel = getRiskLevel(habitScore);
        List<String> insights = generateInsights(fastPct, avgChargeDepth, freqPerWeek);
        String recommendation = getRecommendation(riskLevel);

        // Store analysis
        ChargingHabitAnalysis analysis = new ChargingHabitAnalysis();
        analysis.setVehicle(vehicle);
        analysis.setHabitScore(habitScore);
        analysis.setFastChargingPercentage(fastPct);
        analysis.setChargingFrequencyPerWeek(freqPerWeek);
        analysis.setAverageChargeDepth(avgChargeDepth);
        analysis.setRiskLevel(riskLevel);
        analysis.setAnalysisTimestamp(LocalDateTime.now());
        analysisRepo.save(analysis);

        return new ChargingHabitSummary(
                freqPerWeek, fastPct, avgChargeDepth, habitScore,
                riskLevel, insights, recommendation
        );
    }

    private double calculateFastChargingPercentage(List<ChargingSession> sessions) {
        long fastCount = sessions.stream()
                .filter(s -> s.getChargingType() == ChargingType.DC_FAST ||
                        s.getChargingType() == ChargingType.AC_FAST)
                .count();
        return (fastCount * 100.0) / sessions.size();
    }

    private double calculateAverageChargeDepth(List<ChargingSession> sessions) {
        return sessions.stream()
                .mapToDouble(s -> s.getEndSoc() - s.getStartSoc())
                .average()
                .orElse(60.0);
    }

    private double calculateFrequencyPerWeek(List<ChargingSession> sessions) {
        if (sessions.isEmpty()) return 0;
        LocalDateTime oldest = sessions.get(sessions.size() - 1).getStartTime();
        long days = ChronoUnit.DAYS.between(oldest, LocalDateTime.now());
        return (sessions.size() * 7.0) / Math.max(1, days);
    }

    private double calculateHabitScore(double fastPct, double chargeDepth, double freq) {
        double fastScore = Math.max(0, 100 - fastPct * 1.5);
        double depthScore = chargeDepth > 80 ? 70 : 100;
        double freqScore = freq > 7 ? 60 : 100;
        return (fastScore * 0.5) + (depthScore * 0.3) + (freqScore * 0.2);
    }

    private String getRiskLevel(double score) {
        if (score >= 85) return "Healthy";
        if (score >= 70) return "Moderate";
        if (score >= 50) return "Poor";
        return "Critical";
    }

    private List<String> generateInsights(double fastPct, double chargeDepth, double freq) {
        List<String> insights = new ArrayList<>();
        if (fastPct > 30) insights.add("High fast charging usage detected.");
        if (chargeDepth > 85) insights.add("Frequent high-depth charging observed.");
        if (freq > 7) insights.add("Charging more frequently than average.");
        return insights;
    }

    private String getRecommendation(String riskLevel) {
        return switch (riskLevel) {
            case "Healthy" -> "Continue your excellent charging habits!";
            case "Moderate" -> "Consider reducing fast charging frequency.";
            case "Poor" -> "Optimize charging: avoid 100% charges, reduce fast charging.";
            default -> "Battery habits need significant improvement.";
        };
    }

    private ChargingHabitSummary emptyHabitSummary() {
        return new ChargingHabitSummary(0.0, 0.0, 0.0, 100.0, "Healthy",
                Arrays.asList("No charging data yet"), "Start tracking sessions!");
    }
}
