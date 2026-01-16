package com.ev.AI_battery.dto;

import lombok.*;

@Getter @Setter
@AllArgsConstructor
public class TelemetryDailySummary {
    private Double avgSoc;
    private Double minSoc;
    private Double maxSoc;
    private Double avgTemperature;
}
