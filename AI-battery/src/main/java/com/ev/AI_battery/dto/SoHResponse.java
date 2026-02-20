package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
public class SoHResponse {
    private Double soh;
    private String status;
    private LocalDateTime lastUpdated;
}

