package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @AllArgsConstructor
public class BatteryExplanationResponse {
    private Integer healthScore;
    private Double soh;
    private String explanation;
    private List<ExplanationFactor> factors;
    private LocalDateTime timestamp;
    private String source; // "ML_MODEL" or "FALLBACK"
}
