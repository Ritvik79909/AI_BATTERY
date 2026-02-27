package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter @Setter @AllArgsConstructor
public class AnomalyCheckResponse {
    private boolean hasAnomalies;
    private List<AnomalyAlertResponse> activeAlerts;
    private String summary;
}