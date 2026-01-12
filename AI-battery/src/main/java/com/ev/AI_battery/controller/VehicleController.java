package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.VehicleRequest;
import com.ev.AI_battery.model.User;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping
    public Object addVehicle(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody VehicleRequest request
    ) {
        return vehicleService.createVehicle(userDetails.getUser(), request);
    }

    @GetMapping
    public List<?> getVehicles(@AuthenticationPrincipal User user) {
        return vehicleService.getUserVehicles(user);
    }
}
