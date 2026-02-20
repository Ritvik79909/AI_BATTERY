package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter @AllArgsConstructor
public class ChargingHabitSummary {
    private Double chargingFrequencyPerWeek;
    private Double fastChargingPercentage;
    private Double averageChargeDepth;
    private Double habitScore;
    private String riskLevel;
    private List<String> insights;
    private String recommendation;
}
