package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter @AllArgsConstructor
public class ChargingOptimizationRecommendation {
    private Integer recommendedChargeLimit;
    private String recommendedChargingTime;
    private String fastChargingRecommendation;
    private String chargingFrequencyRecommendation;
    private String optimizationPriority;
    private List<String> explanation;
    private Double estimatedLifespanExtension;
}
