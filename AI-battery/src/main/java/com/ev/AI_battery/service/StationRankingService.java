package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.*;
import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StationRankingService {

    private final LocationService locationService;
    private final BatteryHealthService healthService;
    private final ChargingHabitService habitService;
    private final VehicleService vehicleService;

    // Weight factors for ranking
    private static final double WEIGHT_DISTANCE = 0.4;
    private static final double WEIGHT_POWER = 0.2;
    private static final double WEIGHT_RELIABILITY = 0.2;
    private static final double WEIGHT_COMPATIBILITY = 0.2;

    /**
     * Calculate rank score for a station based on multiple factors
     */
    public double calculateRankScore(
            ChargingStation station,
            double userLat,
            double userLon,
            String preferredConnector,
            Vehicle vehicle,
            boolean contextAware) {

        // 1. Distance score (0-100) - closer = higher score
        double distance = locationService.calculateDistance(
                userLat, userLon,
                station.getLatitude(), station.getLongitude()
        );
        double distanceScore = Math.max(0, 100 - (distance * 5)); // 20km = 0 score

        // 2. Power score (0-100) - higher power = higher score
        double powerScore = station.getMaxPowerKw() != null ?
                Math.min(100, station.getMaxPowerKw()) : 50;

        // 3. Reliability score (already 0-100)
        double reliabilityScore = station.getReliabilityScore() != null ?
                station.getReliabilityScore() : 70;

        // 4. Compatibility score
        double compatibilityScore = calculateCompatibilityScore(
                station, preferredConnector, vehicle
        );

        // 5. Context-aware adjustments (if enabled)
        if (contextAware && vehicle != null) {
            compatibilityScore = adjustForBatteryHealth(
                    station, vehicle, compatibilityScore
            );
        }

        // Weighted sum
        double rankScore =
                (WEIGHT_DISTANCE * distanceScore) +
                        (WEIGHT_POWER * powerScore) +
                        (WEIGHT_RELIABILITY * reliabilityScore) +
                        (WEIGHT_COMPATIBILITY * compatibilityScore);

        return Math.min(100, Math.max(0, rankScore));
    }

    /**
     * Calculate compatibility score based on connector type and vehicle specs
     */
    private double calculateCompatibilityScore(
            ChargingStation station,
            String preferredConnector,
            Vehicle vehicle) {

        double score = 70; // Base score

        String[] stationConnectors = station.getConnectorTypes().split(",");

        // Check if preferred connector is available
        if (preferredConnector != null && !preferredConnector.equals("ALL")) {
            boolean hasPreferred = Arrays.stream(stationConnectors)
                    .anyMatch(c -> c.trim().equalsIgnoreCase(preferredConnector));

            if (!hasPreferred) {
                return 0; // Incompatible if preferred connector not available
            }
            score += 20; // Bonus for having preferred connector
        }

        // Check vehicle compatibility
        if (vehicle != null && vehicle.getFastChargeSupported() != null) {
            if (vehicle.getFastChargeSupported()) {
                // Vehicle supports fast charging, check for DC fast connectors
                boolean hasFastConnector = Arrays.stream(stationConnectors)
                        .anyMatch(c -> c.trim().equals("CCS") ||
                                c.trim().equals("CHADEMO"));

                if (hasFastConnector) {
                    score += 10;
                }
            }
        }

        return Math.min(100, score);
    }

    /**
     * Adjust recommendation based on battery health context
     */
    private double adjustForBatteryHealth(
            ChargingStation station,
            Vehicle vehicle,
            double currentScore) {

        try {
            HealthScoreResponse health = healthService.getScore(vehicle);

            // If battery health is low, prefer slower charging stations
            if (health.getHealthScore() < 70) {
                // Lower score for fast charging stations
                if (station.getMaxPowerKw() > 100) {
                    currentScore *= 0.7; // 30% penalty for fast charging
                }
            }

            // If battery temperature is a concern, prefer stations with shade/indoor
            // This would require additional station metadata

        } catch (Exception e) {
            log.warn("Could not adjust for battery health: {}", e.getMessage());
        }

        return currentScore;
    }

    /**
     * Generate recommendation reason
     */
    public String generateRecommendationReason(
            ChargingStation station,
            double distance,
            double rankScore,
            Vehicle vehicle) {

        List<String> reasons = new ArrayList<>();

        if (distance < 2) {
            reasons.add("closest station to you");
        } else if (distance < 5) {
            reasons.add("very close to your location");
        }

        if (station.getReliabilityScore() > 90) {
            reasons.add("highly reliable based on user feedback");
        } else if (station.getReliabilityScore() > 80) {
            reasons.add("good reliability record");
        }

        if (station.getMaxPowerKw() > 150) {
            reasons.add("ultra-fast charging available");
        } else if (station.getMaxPowerKw() > 50) {
            reasons.add("fast charging compatible");
        }

        if (vehicle != null) {
            try {
                HealthScoreResponse health = healthService.getScore(vehicle);
                if (health.getHealthScore() < 70 && station.getMaxPowerKw() < 50) {
                    reasons.add("gentle charging recommended for battery health");
                }
            } catch (Exception e) {
                // Ignore
            }
        }

        if (reasons.isEmpty()) {
            return "Matches your search criteria";
        }

        return "Recommended because it's " + String.join(", ", reasons);
    }
}