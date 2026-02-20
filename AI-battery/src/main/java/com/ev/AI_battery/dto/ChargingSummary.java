package com.ev.AI_battery.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChargingSummary {
    private int totalSessions;
    private double avgDurationMinutes;
    private double fastChargingPercentage;
    private double avgEnergyAddedKwh;
}
