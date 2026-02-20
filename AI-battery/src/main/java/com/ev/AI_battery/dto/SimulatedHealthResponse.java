package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter @AllArgsConstructor
public class SimulatedHealthResponse {
    private Integer healthScore;
    private Double soh;
    private Integer rulCycles;
    private Integer estimatedMonths;
    private List<Double> degradationTrend;
    private String source;
    private Double degradationRate;
}
