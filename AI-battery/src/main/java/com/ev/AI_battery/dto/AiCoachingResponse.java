package com.ev.AI_battery.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @AllArgsConstructor
public class AiCoachingResponse {
    private String answer;
    private String issueType;
    private String severity;
    private List<String> recommendations;
    private LocalDateTime timestamp;
}
