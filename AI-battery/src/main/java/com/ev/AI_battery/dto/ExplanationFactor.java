package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class ExplanationFactor {
    private String factor;
    private Double contribution;
    private String impact;
    private String description;
}
