package com.ev.AI_battery.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class VehicleFromExtractionRequest {
    private Long documentId;
    private VehicleRequest finalVehiclePayload;
}
