package com.ev.AI_battery.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor
public class StationRecommendationResponse {
    private Long id;
    private String stationName;
    private Double distanceKm;
    private Double maxPowerKw;
    private List<String> connectorTypes;
    private String networkOperator;
    private Double reliabilityScore;
    private Double pricePerKwh;
    private Double rankScore;
    private String recommendationReason;
    private Boolean isRecommendedForBattery;
    private String address;
    private Boolean hasAvailableConnectors;
    private Integer estimatedChargingMinutes; // For 20-80% charge
    private Double latitude;
    private Double longitude;
}