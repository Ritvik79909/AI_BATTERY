package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class RULResponse {
    private Integer rulCycles;
    private Integer estimatedMonths;
    private String confidence;
}

