package com.ev.AI_battery.dto;

import com.ev.AI_battery.model.VehicleType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VehicleRequest {

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
    private String chemistry;
    private Double ratedRangeKm;

    // Charging capability
    private Boolean fastChargeSupported;
    private Double maxAcPowerKw;
    private Double maxDcPowerKw;

    private VehicleType vehicleType;
}
