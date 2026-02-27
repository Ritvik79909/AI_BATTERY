package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.AnomalyAlertResponse;
import com.ev.AI_battery.dto.AnomalyCheckResponse;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.AnomalyDetectionService;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/anomaly")
@RequiredArgsConstructor
@Slf4j
public class AnomalyController {

    private final AnomalyDetectionService anomalyService;
    private final VehicleService vehicleService;

    /**
     * Manually trigger anomaly check for a vehicle
     */
    @PostMapping("/check/{vehicleId}")
    public ResponseEntity<?> checkAnomalies(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        try {
            // Check if user is authenticated
            if (user == null) {
                log.error("User is not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("User not authenticated");
            }

            log.info("User {} checking anomalies for vehicle {}", user.getUsername(), vehicleId);

            Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
            List<AnomalyAlertResponse> alerts = anomalyService.checkVehicleAnomalies(vehicle);

            return ResponseEntity.ok(alerts);

        } catch (Exception e) {
            log.error("Error checking anomalies: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error checking anomalies: " + e.getMessage());
        }
    }

    /**
     * Get active alerts for vehicle
     */
    @GetMapping("/alerts/active/{vehicleId}")
    public ResponseEntity<?> getActiveAlerts(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        try {
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("User not authenticated");
            }

            log.info("Fetching active alerts for vehicle {}", vehicleId);

            Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
            List<AnomalyAlertResponse> alerts = anomalyService.getActiveAlerts(vehicle);

            return ResponseEntity.ok(alerts);

        } catch (Exception e) {
            log.error("Error fetching alerts: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching alerts: " + e.getMessage());
        }
    }

    /**
     * Get all alerts for vehicle
     */
    @GetMapping("/alerts/all/{vehicleId}")
    public ResponseEntity<?> getAllAlerts(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        try {
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("User not authenticated");
            }

            Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
            List<AnomalyAlertResponse> alerts = anomalyService.getAllAlerts(vehicle);

            return ResponseEntity.ok(alerts);

        } catch (Exception e) {
            log.error("Error fetching all alerts: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching alerts: " + e.getMessage());
        }
    }

    /**
     * Get alert summary
     */
    @GetMapping("/summary/{vehicleId}")
    public ResponseEntity<?> getAlertSummary(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        try {
            // FIX: Check if user is null
            if (user == null) {
                log.error("User is null - authentication failed");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("User not authenticated");
            }

            log.info("Fetching alert summary for vehicle {} by user {}",
                    vehicleId, user.getUsername());

            Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
            AnomalyCheckResponse summary = anomalyService.getAlertSummary(vehicle);

            return ResponseEntity.ok(summary);

        } catch (Exception e) {
            log.error("Error fetching alert summary: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching summary: " + e.getMessage());
        }
    }

    /**
     * Resolve an alert
     */
    @PostMapping("/alerts/{alertId}/resolve")
    public ResponseEntity<?> resolveAlert(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long alertId,
            @RequestParam(required = false) String notes) {

        try {
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("User not authenticated");
            }

            log.info("Resolving alert {} by user {}", alertId, user.getUsername());

            AnomalyAlertResponse resolved = anomalyService.resolveAlert(alertId, notes);

            return ResponseEntity.ok(resolved);

        } catch (Exception e) {
            log.error("Error resolving alert: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error resolving alert: " + e.getMessage());
        }
    }
}