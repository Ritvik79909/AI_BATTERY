package com.ev.AI_battery.model;

import com.ev.AI_battery.model.VehicleType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vehicles")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Ownership
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType = VehicleType.CAR;

    // Core identifiers
    private String nickname;
    private String make;
    private String model;
    private String variant;
    private Integer year;
    private String vin;

    // Battery details
    private Double batteryCapacityKwh;
    private Double usableCapacityKwh;
    private String chemistry; // NMC / LFP
    private Double ratedRangeKm;

    private Boolean fastChargeSupported;
    private Double maxAcPowerKw;
    private Double maxDcPowerKw;

    private Boolean isDefault = false;
}
