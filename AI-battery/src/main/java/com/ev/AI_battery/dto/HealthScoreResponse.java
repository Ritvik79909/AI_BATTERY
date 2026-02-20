package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class HealthScoreResponse {
    private Integer healthScore;
    private String label;
}

