package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter @AllArgsConstructor
public class AnomalyAlertResponse {
    private Long id;
    private String alertType;
    private String severity;
    private String message;
    private String recommendedAction;
    private Double detectedValue;
    private Double normalMin;
    private Double normalMax;
    private LocalDateTime timestamp;
    private String status;
}