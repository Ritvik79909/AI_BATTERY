package com.ev.AI_battery.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor
public class StationDetailResponse {
    private Long id;
    private String stationName;
    private String address;
    private String city;
    private String state;
    private Double latitude;
    private Double longitude;
    private List<ConnectorDetail> connectors;
    private String networkOperator;
    private Double reliabilityScore;
    private Double pricePerKwh;
    private Boolean isPublic;
    private Boolean isFree;
    private Boolean isOperational;
    private String phoneNumber;
    private String website;
    private List<String> amenities;
    private String lastVerified;
}

