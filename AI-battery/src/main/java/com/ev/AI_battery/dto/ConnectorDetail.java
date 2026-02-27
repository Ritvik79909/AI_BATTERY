package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ConnectorDetail {
    private String type; // CCS, CHADEMO, TYPE2
    private Double powerKw;
    private Integer totalCount;
    private Integer availableCount;
    private String status; // Available, InUse, OutOfService
}
