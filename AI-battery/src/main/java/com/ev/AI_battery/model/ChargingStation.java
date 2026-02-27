package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "charging_stations",
        indexes = {
                @Index(name = "idx_station_location", columnList = "latitude,longitude"),
                @Index(name = "idx_connector_type", columnList = "connector_types")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ChargingStation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String stationName;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private String address;
    private String city;
    private String state;
    private String zipCode;

    @Column(nullable = false)
    private String connectorTypes; // Comma-separated: CCS,CHADEMO,TYPE2

    private Double maxPowerKw;
    private Double pricePerKwh;
    private String networkOperator;

    @Column(nullable = false)
    private Double reliabilityScore; // 0-100 based on historical data

    private Boolean isPublic;
    private Boolean isFree;
    private Boolean isOperational;

    private Integer totalConnectors;
    private Integer availableConnectors;

    private String phoneNumber;
    private String website;

    private LocalDateTime lastUpdated;
    private String dataSource; // NREL, OPENCHARGE, CUSTOM
}