package com.ev.AI_battery.dto;

import com.ev.AI_battery.model.ChargingType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ChargingSessionRequest {
        private Long vehicleId;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private Double startSoc;
        private Double endSoc;
        private ChargingType chargingType;
}
