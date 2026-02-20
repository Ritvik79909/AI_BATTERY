package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.ChargingSessionRequest;
import com.ev.AI_battery.dto.ChargingSummary;
import com.ev.AI_battery.model.ChargingSession;
import com.ev.AI_battery.model.ChargingType;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.ChargingSessionService;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/charging-session")
@RequiredArgsConstructor
public class ChargingSessionController {
    private final ChargingSessionService sessionService;
    private final VehicleService vehicleService;

    @PostMapping("/log")
    public ChargingSession logSession(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestBody ChargingSessionRequest req) {
        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), req.getVehicleId());
        return sessionService.logSession(vehicle, req);
    }

    @GetMapping("/history/{vehicleId}")
    public List<ChargingSession> getHistory(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {
        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return sessionService.getHistory(vehicle);
    }

    @GetMapping("/recent/{vehicleId}")
    public List<ChargingSession> getRecent(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {
        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return sessionService.getRecent(vehicle);
    }

    @GetMapping("/summary/{vehicleId}")
    public ChargingSummary getSummary(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {
        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return sessionService.getSummary(vehicle);
    }
}


