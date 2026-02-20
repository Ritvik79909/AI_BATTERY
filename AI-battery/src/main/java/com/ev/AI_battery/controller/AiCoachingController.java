package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.AiCoachingRequest;
import com.ev.AI_battery.dto.AiCoachingResponse;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.AiCoachingService;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-coach")
@RequiredArgsConstructor
public class AiCoachingController {

    private final AiCoachingService coachingService;
    private final VehicleService vehicleService;

    @PostMapping("/query")
    public AiCoachingResponse askQuestion(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestBody AiCoachingRequest request) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), request.getVehicleId());
        return coachingService.askQuestion(vehicle, request.getQuestion());
    }
}

