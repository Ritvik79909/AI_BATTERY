package com.ev.AI_battery.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class VehicleRequest {
    public String nickname;
    public String make;
    public String model;
    public String variant;
    public Integer year;
    public String vin;

    public Double batteryCapacityKwh;
    public String chemistry;
    public Boolean fastChargeSupported;
}
