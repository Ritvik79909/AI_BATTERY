package com.ev.AI_battery.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AiCoachingRequest {
    private Long vehicleId;
    private String question;
}
