package com.ev.AI_battery.controller;

import com.ev.AI_battery.model.BatteryDailySummary;
import com.ev.AI_battery.model.ProcessedBatteryTelemetry;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.repository.BatteryDailySummaryRepository;
import com.ev.AI_battery.repository.ProcessedBatteryTelemetryRepository;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/battery/processed")
@RequiredArgsConstructor
public class ProcessedBatteryController {

    private final ProcessedBatteryTelemetryRepository processedRepo;
    private final BatteryDailySummaryRepository dailyRepo;
    private final VehicleService vehicleService;

    @GetMapping("/latest/{vehicleId}")
    public ProcessedBatteryTelemetry latest(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId
    ) {
        Vehicle v = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return processedRepo.findTop1ByVehicleOrderByTimestampDesc(v);
    }

    @GetMapping("/daily/{vehicleId}")
    public List<BatteryDailySummary> daily(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId
    ) {
        Vehicle v = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return dailyRepo.findByVehicleOrderByDateDesc(v);
    }
}

