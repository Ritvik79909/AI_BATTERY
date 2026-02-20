package com.ev.AI_battery.service;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter
public class CoachingContext {
    private String issueType = "General";
    private String severity = "LOW";
    private Double healthScore;
    private Double soh;
    private Integer rulCycles;
    private Double fastChargingPct;
    private Double habitScore;
    private List<String> recommendations;
}