package com.ev.AI_battery.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor
public class StationRecommendationRequest {
    private Double latitude;
    private Double longitude;
    private Double radiusKm = 20.0; // Default 20km
    private String connectorType; // CCS, CHADEMO, TYPE2, or ALL
    private Boolean fastChargingOnly = false;
    private Double minPowerKw = 0.0;
    private Boolean requireReliable = false;
    private Long vehicleId; // For context-aware recommendations
    private String sortBy = "score"; // score, distance, power, price
    private Integer limit = 20;
}