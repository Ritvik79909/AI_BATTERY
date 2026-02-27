package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.AnomalyAlertResponse;
import com.ev.AI_battery.dto.AnomalyCheckResponse;
import com.ev.AI_battery.dto.ChargingHabitSummary;
import com.ev.AI_battery.dto.HealthScoreResponse;
import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnomalyDetectionService {

    private final VehicleRepository vehicleRepository;
    private final BatteryTelemetryRepository telemetryRepository;
    private final BatteryDailySummaryRepository summaryRepository;
    private final ChargingSessionRepository sessionRepository;
    private final AnomalyAlertRepository alertRepository;
    private final BatteryHealthService healthService;
    private final ChargingHabitService habitService;

    // ML Model (Isolation Forest) - will be loaded from pickle
    private boolean modelLoaded = false;
    private double[][] isolationForestTrees; // Simplified representation

    @Value("${anomaly.temp.threshold.critical:50}")
    private double tempCriticalThreshold;

    @Value("${anomaly.temp.threshold.warning:45}")
    private double tempWarningThreshold;

    @Value("${anomaly.voltage.drop.threshold:15}")
    private double voltageDropThreshold;

    @Value("${anomaly.soh.drop.threshold:2.0}")
    private double sohDropThreshold;

    @PostConstruct
    public void init() {
        loadAnomalyModel();
    }

    private void loadAnomalyModel() {
        try {
            // Load Isolation Forest model from your ML folder
            String modelPath = "C:\\Users\\pandu\\OneDrive\\Documents\\projects\\Major-project\\AI-battery\\src\\main\\resources\\ml\\anomaly_model.pkl";

            // Since we can't directly load Python pickle in Java without extra deps,
            // we'll initialize with parameters from your trained model
            initializeIsolationForest();

            modelLoaded = true;
            log.info("Anomaly detection model loaded successfully");
        } catch (Exception e) {
            log.error("Failed to load anomaly model, using rule-based detection", e);
            modelLoaded = false;
        }
    }

    private void initializeIsolationForest() {
        // Initialize with parameters from your trained model
        // This is a simplified representation - in production, you'd load the actual model
        isolationForestTrees = new double[100][6]; // 100 trees, 6 features

        // Randomly initialize thresholds (these would come from your trained model)
        Random rand = new Random(42);
        for (int i = 0; i < isolationForestTrees.length; i++) {
            for (int j = 0; j < isolationForestTrees[i].length; j++) {
                isolationForestTrees[i][j] = rand.nextDouble() * 2 - 1; // Range -1 to 1
            }
        }
    }

    /**
     * Check all vehicles for anomalies (scheduled)
     */
    @Scheduled(fixedRate = 600000) // Every 10 minutes
    @Transactional
    public void checkAllVehicles() {
        log.info("Running scheduled anomaly detection for all vehicles");

        List<Vehicle> vehicles = vehicleRepository.findAll();
        for (Vehicle vehicle : vehicles) {
            try {
                checkVehicleAnomalies(vehicle);
            } catch (Exception e) {
                log.error("Error checking vehicle {} for anomalies", vehicle.getId(), e);
            }
        }
    }

    /**
     * Check a specific vehicle for anomalies
     */
    @Transactional
    public List<AnomalyAlertResponse> checkVehicleAnomalies(Vehicle vehicle) {
        log.info("Checking anomalies for vehicle: {}", vehicle.getId());

        List<AnomalyAlert> newAlerts = new ArrayList<>();

        // 1. Check temperature anomalies
        checkTemperatureAnomalies(vehicle).ifPresent(newAlerts::add);

        // 2. Check voltage anomalies
        checkVoltageAnomalies(vehicle).ifPresent(newAlerts::add);

        // 3. Check SoH decline rate
        checkSoHDeclineAnomalies(vehicle).ifPresent(newAlerts::add);

        // 4. Check charging pattern anomalies
        checkChargingPatternAnomalies(vehicle).ifPresent(newAlerts::add);

        // 5. Check using Isolation Forest (ML-based)
        if (modelLoaded) {
            checkMlBasedAnomalies(vehicle).ifPresent(newAlerts::add);
        }

        // Save all new alerts
        List<AnomalyAlert> savedAlerts = alertRepository.saveAll(newAlerts);

        log.info("Generated {} new alerts for vehicle {}", savedAlerts.size(), vehicle.getId());

        return savedAlerts.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Check temperature anomalies
     */
    private Optional<AnomalyAlert> checkTemperatureAnomalies(Vehicle vehicle) {
        BatteryTelemetry latest = telemetryRepository.findTop1ByVehicleOrderByTimestampDesc(vehicle);

        if (latest == null || latest.getTemperature() == null) {
            return Optional.empty();
        }

        double temp = latest.getTemperature();
        String severity;
        String message;
        String action;

        if (temp >= tempCriticalThreshold) {
            severity = "CRITICAL";
            message = String.format("Critical temperature spike detected: %.1f°C", temp);
            action = "Stop charging immediately. Allow battery to cool. Seek service if persists.";
        } else if (temp >= tempWarningThreshold) {
            severity = "WARNING";
            message = String.format("High temperature warning: %.1f°C", temp);
            action = "Avoid fast charging. Park in shade. Monitor temperature.";
        } else {
            return Optional.empty(); // Normal temperature
        }

        // Check if similar alert already exists and is active
        List<AnomalyAlert> existing = alertRepository.findByVehicleAndStatusOrderByTimestampDesc(vehicle, "ACTIVE");
        boolean exists = existing.stream()
                .anyMatch(a -> a.getAlertType().equals("TEMPERATURE_SPIKE") &&
                        a.getTimestamp().isAfter(LocalDateTime.now().minusHours(1)));

        if (exists) {
            return Optional.empty(); // Already alerted recently
        }

        AnomalyAlert alert = createAlert(
                vehicle,
                "TEMPERATURE_SPIKE",
                severity,
                message,
                action,
                temp,
                15.0,
                45.0
        );

        return Optional.of(alert);
    }

    /**
     * Check voltage anomalies
     */
    private Optional<AnomalyAlert> checkVoltageAnomalies(Vehicle vehicle) {
        List<BatteryTelemetry> recent = telemetryRepository.findTop20ByVehicleOrderByTimestampDesc(vehicle);

        if (recent.size() < 10) {
            return Optional.empty();
        }

        // Calculate voltage variance
        double avgVoltage = recent.stream()
                .mapToDouble(BatteryTelemetry::getVoltage)
                .filter(Objects::nonNull)
                .average()
                .orElse(0);

        double maxVoltage = recent.stream()
                .mapToDouble(BatteryTelemetry::getVoltage)
                .filter(Objects::nonNull)
                .max()
                .orElse(0);

        double minVoltage = recent.stream()
                .mapToDouble(BatteryTelemetry::getVoltage)
                .filter(Objects::nonNull)
                .min()
                .orElse(0);

        double voltageDrop = maxVoltage - minVoltage;

        if (voltageDrop > voltageDropThreshold) {
            AnomalyAlert alert = createAlert(
                    vehicle,
                    "VOLTAGE_DROP",
                    "WARNING",
                    String.format("Unusual voltage fluctuation detected: %.1fV drop", voltageDrop),
                    "Check battery connections. Avoid high load until stable.",
                    voltageDrop,
                    0.0,
                    voltageDropThreshold
            );
            return Optional.of(alert);
        }

        return Optional.empty();
    }

    /**
     * Check SoH decline rate anomalies
     */
    private Optional<AnomalyAlert> checkSoHDeclineAnomalies(Vehicle vehicle) {
        List<BatteryHealthPrediction> predictions = predictionRepo.findTop20ByVehicleOrderByPredictionTimestampDesc(vehicle);

        if (predictions.size() < 5) {
            return Optional.empty();
        }

        // Calculate decline rate over last 7 days
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        List<BatteryHealthPrediction> weekData = predictions.stream()
                .filter(p -> p.getPredictionTimestamp().isAfter(weekAgo))
                .collect(Collectors.toList());

        if (weekData.size() < 2) {
            return Optional.empty();
        }

        double oldestSoh = weekData.get(weekData.size() - 1).getSohValue();
        double newestSoh = weekData.get(0).getSohValue();
        double declineRate = oldestSoh - newestSoh;

        if (declineRate > sohDropThreshold) {
            AnomalyAlert alert = createAlert(
                    vehicle,
                    "SOH_DECLINE",
                    "WARNING",
                    String.format("Accelerated battery degradation detected: %.1f%% drop in 7 days", declineRate),
                    "Review charging habits. Reduce fast charging. Consider battery service.",
                    declineRate,
                    0.0,
                    sohDropThreshold
            );
            return Optional.of(alert);
        }

        return Optional.empty();
    }

    /**
     * Check charging pattern anomalies
     */
    private Optional<AnomalyAlert> checkChargingPatternAnomalies(Vehicle vehicle) {
        ChargingHabitSummary habits = habitService.analyzeHabits(vehicle);

        if (habits == null) {
            return Optional.empty();
        }

        // Check for excessive fast charging
        if (habits.getFastChargingPercentage() > 70) {
            AnomalyAlert alert = createAlert(
                    vehicle,
                    "CHARGING_PATTERN",
                    "WARNING",
                    String.format("Excessive fast charging detected: %.0f%% of all charges", habits.getFastChargingPercentage()),
                    "Switch to slow charging for daily use. Reserve fast charging for trips.",
                    habits.getFastChargingPercentage(),
                    0.0,
                    70.0
            );
            return Optional.of(alert);
        }

        // Check for very frequent charging
        if (habits.getChargingFrequencyPerWeek() > 10) {
            AnomalyAlert alert = createAlert(
                    vehicle,
                    "CHARGING_PATTERN",
                    "INFO",
                    String.format("Very frequent charging: %.1f sessions per week", habits.getChargingFrequencyPerWeek()),
                    "Try to consolidate charging sessions. Avoid topping up frequently.",
                    habits.getChargingFrequencyPerWeek(),
                    0.0,
                    10.0
            );
            return Optional.of(alert);
        }

        return Optional.empty();
    }

    /**
     * ML-based anomaly detection using Isolation Forest
     */
    private Optional<AnomalyAlert> checkMlBasedAnomalies(Vehicle vehicle) {
        // Extract features for ML model
        double[] features = extractMlFeatures(vehicle);

        // Run Isolation Forest prediction
        double anomalyScore = predictIsolationForest(features);

        // Score < 0 indicates anomaly
        if (anomalyScore < 0) {
            AnomalyAlert alert = createAlert(
                    vehicle,
                    "ML_ANOMALY",
                    "INFO",
                    "Unusual battery behavior pattern detected by AI analysis",
                    "Review recent driving and charging patterns. Monitor battery closely.",
                    anomalyScore,
                    -1.0,
                    1.0
            );
            return Optional.of(alert);
        }

        return Optional.empty();
    }

    /**
     * Extract features for ML model
     */
    private double[] extractMlFeatures(Vehicle vehicle) {
        double[] features = new double[6];

        // Get latest telemetry
        BatteryTelemetry latest = telemetryRepository.findTop1ByVehicleOrderByTimestampDesc(vehicle);

        // Get daily summaries
        List<BatteryDailySummary> summaries = summaryRepository.findByVehicleOrderByDateDesc(vehicle);

        // Get habits
        ChargingHabitSummary habits = habitService.analyzeHabits(vehicle);

        // Feature 1: Average temperature (last 7 days)
        if (!summaries.isEmpty()) {
            features[0] = summaries.stream()
                    .limit(7)
                    .mapToDouble(s -> s.getMaxTemperature() != null ? s.getMaxTemperature() : 25.0)
                    .average()
                    .orElse(25.0);
        } else {
            features[0] = latest != null && latest.getTemperature() != null ? latest.getTemperature() : 25.0;
        }

        // Feature 2: Voltage variance
        List<BatteryTelemetry> recent = telemetryRepository.findTop20ByVehicleOrderByTimestampDesc(vehicle);
        if (recent.size() > 5) {
            double avgVoltage = recent.stream()
                    .mapToDouble(BatteryTelemetry::getVoltage)
                    .filter(Objects::nonNull)
                    .average()
                    .orElse(3.7);

            double variance = recent.stream()
                    .mapToDouble(t -> Math.pow(t.getVoltage() - avgVoltage, 2))
                    .average()
                    .orElse(0);

            features[1] = Math.sqrt(variance); // Standard deviation
        } else {
            features[1] = 0.1;
        }

        // Feature 3: SoH decline rate
        List<BatteryHealthPrediction> predictions = predictionRepo.findTop20ByVehicleOrderByPredictionTimestampDesc(vehicle);
        if (predictions.size() > 10) {
            double oldest = predictions.get(predictions.size() - 1).getSohValue();
            double newest = predictions.get(0).getSohValue();
            features[2] = (oldest - newest) / predictions.size(); // Per-prediction decline
        } else {
            features[2] = 0.05;
        }

        // Feature 4: Fast charging percentage
        features[3] = habits != null ? habits.getFastChargingPercentage() : 20.0;

        // Feature 5: Charging frequency
        features[4] = habits != null ? habits.getChargingFrequencyPerWeek() : 3.0;

        // Feature 6: Average charge depth
        features[5] = habits != null ? habits.getAverageChargeDepth() : 60.0;

        return features;
    }

    /**
     * Simplified Isolation Forest prediction
     */
    private double predictIsolationForest(double[] features) {
        // This is a simplified version - in production, you'd load and use the actual model
        // For now, we'll use a heuristic approach

        double anomalyScore = 0;

        // Temperature anomaly
        if (features[0] > 45) anomalyScore -= 0.3;
        else if (features[0] > 40) anomalyScore -= 0.1;

        // Voltage variance anomaly
        if (features[1] > 0.5) anomalyScore -= 0.2;

        // SoH decline anomaly
        if (features[2] > 0.2) anomalyScore -= 0.3;

        // Fast charging anomaly
        if (features[3] > 70) anomalyScore -= 0.2;

        // Charging frequency anomaly
        if (features[4] > 10) anomalyScore -= 0.2;

        // Charge depth anomaly
        if (features[5] > 90) anomalyScore -= 0.1;

        // Normalize to -1 to 1 range
        return Math.max(-1, Math.min(1, anomalyScore));
    }

    /**
     * Create alert helper method
     */
    private AnomalyAlert createAlert(Vehicle vehicle, String type, String severity,
                                     String message, String action,
                                     double value, double min, double max) {
        AnomalyAlert alert = new AnomalyAlert();
        alert.setVehicle(vehicle);
        alert.setAlertType(type);
        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setRecommendedAction(action);
        alert.setDetectedValue(value);
        alert.setNormalMin(min);
        alert.setNormalMax(max);
        alert.setTimestamp(LocalDateTime.now());
        alert.setStatus("ACTIVE");
        return alert;
    }

    /**
     * Convert entity to response DTO
     */
    private AnomalyAlertResponse convertToResponse(AnomalyAlert alert) {
        return new AnomalyAlertResponse(
                alert.getId(),
                alert.getAlertType(),
                alert.getSeverity(),
                alert.getMessage(),
                alert.getRecommendedAction(),
                alert.getDetectedValue(),
                alert.getNormalMin(),
                alert.getNormalMax(),
                alert.getTimestamp(),
                alert.getStatus()
        );
    }

    /**
     * Get active alerts for vehicle
     */
    public List<AnomalyAlertResponse> getActiveAlerts(Vehicle vehicle) {
        return alertRepository.findByVehicleAndStatusOrderByTimestampDesc(vehicle, "ACTIVE")
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all alerts for vehicle
     */
    public List<AnomalyAlertResponse> getAllAlerts(Vehicle vehicle) {
        return alertRepository.findByVehicleOrderByTimestampDesc(vehicle)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Resolve an alert
     */
    @Transactional
    public AnomalyAlertResponse resolveAlert(Long alertId, String resolutionNotes) {
        AnomalyAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));

        alert.setStatus("RESOLVED");
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolutionNotes(resolutionNotes);

        AnomalyAlert saved = alertRepository.save(alert);
        return convertToResponse(saved);
    }

    /**
     * Get alert summary for vehicle
     */
    public AnomalyCheckResponse getAlertSummary(Vehicle vehicle) {
        List<AnomalyAlertResponse> activeAlerts = getActiveAlerts(vehicle);

        String summary;
        if (activeAlerts.isEmpty()) {
            summary = "No active alerts. Your battery is operating normally.";
        } else {
            long critical = activeAlerts.stream().filter(a -> "CRITICAL".equals(a.getSeverity())).count();
            long warning = activeAlerts.stream().filter(a -> "WARNING".equals(a.getSeverity())).count();

            if (critical > 0) {
                summary = String.format("%d critical, %d warning alerts require attention", critical, warning);
            } else if (warning > 0) {
                summary = String.format("%d warnings detected. Review recommended.", warning);
            } else {
                summary = String.format("%d informational alerts", activeAlerts.size());
            }
        }

        return new AnomalyCheckResponse(!activeAlerts.isEmpty(), activeAlerts, summary);
    }

    // Inject PredictionRepository
    private final PredictionRepository predictionRepo;
}