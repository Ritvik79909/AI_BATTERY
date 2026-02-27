package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.*;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.StationRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stations")
@RequiredArgsConstructor
@Slf4j
public class StationRecommendationController {

    private final StationRecommendationService recommendationService;

    /**
     * Get recommended charging stations based on location and filters
     */
    @GetMapping("/recommend")
    public ResponseEntity<?> getRecommendations(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(required = false, defaultValue = "20") Double radius,
            @RequestParam(required = false, defaultValue = "ALL") String connector,
            @RequestParam(required = false, defaultValue = "false") Boolean fastOnly,
            @RequestParam(required = false, defaultValue = "0") Double minPower,
            @RequestParam(required = false) Long vehicleId,
            @RequestParam(required = false, defaultValue = "20") Integer limit) {

        try {
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("error", "User not authenticated"));
            }

            log.info("Station recommendation request: lat={}, lon={}, radius={}, connector={}",
                    lat, lon, radius, connector);

            StationRecommendationRequest request = new StationRecommendationRequest(
                    lat, lon, radius, connector, fastOnly, minPower, false, vehicleId, "score", limit
            );

            List<StationRecommendationResponse> recommendations =
                    recommendationService.getRecommendations(request, user.getUser());

            return ResponseEntity.ok(recommendations);

        } catch (Exception e) {
            log.error("Error getting recommendations: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Error getting recommendations",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Get detailed information for a specific station
     */
    @GetMapping("/{stationId}")
    public ResponseEntity<?> getStationDetails(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long stationId) {

        try {
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("error", "User not authenticated"));
            }

            StationDetailResponse details = recommendationService.getStationDetails(stationId);
            return ResponseEntity.ok(details);

        } catch (Exception e) {
            log.error("Error getting station details: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Error getting station details",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Get filter options for UI
     */
    @GetMapping("/filters")
    public ResponseEntity<?> getFilterOptions() {
        return ResponseEntity.ok(Map.of(
                "connectorTypes", List.of("CCS", "CHADEMO", "TYPE2", "TESLA"),
                "radiusOptions", List.of(5, 10, 20, 30, 50),
                "powerLevels", List.of(
                        Map.of("label", "Slow (<22kW)", "value", 22),
                        Map.of("label", "Fast (22-100kW)", "value", 100),
                        Map.of("label", "Ultra Fast (>100kW)", "value", 150)
                )
        ));
    }
}