package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.ChargingOptimizationRecommendation;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.ChargingOptimizationService;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/charging-optimization")
@RequiredArgsConstructor
public class ChargingOptimizationController {

    private final ChargingOptimizationService optService;
    private final VehicleService vehicleService;

    @GetMapping("/{vehicleId}")
    public ChargingOptimizationRecommendation getRecommendations(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return optService.getRecommendations(vehicle);
    }
}

