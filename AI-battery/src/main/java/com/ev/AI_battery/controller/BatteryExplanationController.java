package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.BatteryExplanationResponse;
import com.ev.AI_battery.model.BatteryExplanation;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.repository.BatteryExplanationRepository;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.BatteryExplanationService;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/battery-health/explanation")
@RequiredArgsConstructor
public class BatteryExplanationController {

    private final BatteryExplanationService explanationService;
    private final VehicleService vehicleService;
    private final BatteryExplanationRepository explanationRepo;

    /**
     * Get current explanation for vehicle
     */
    @GetMapping("/{vehicleId}")
    public BatteryExplanationResponse getExplanation(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return explanationService.getExplanation(vehicle);
    }

    /**
     * Get explanation history
     */
    @GetMapping("/history/{vehicleId}")
    public List<BatteryExplanation> getExplanationHistory(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return explanationRepo.findTop10ByVehicleOrderByTimestampDesc(vehicle);
    }

    /**
     * Get latest stored explanation
     */
    @GetMapping("/latest/{vehicleId}")
    public BatteryExplanation getLatestExplanation(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return explanationRepo.findTop1ByVehicleOrderByTimestampDesc(vehicle);
    }
}