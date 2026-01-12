package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.VehicleRequest;
import com.ev.AI_battery.model.User;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.ev.AI_battery.dto.VehicleResponse;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping
    public Vehicle createVehicle(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody VehicleRequest request
    ) {
        User user = userDetails.getUser();
        return vehicleService.createVehicle(user, request);
    }

    @GetMapping
    public List<VehicleResponse> getVehicles(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return vehicleService.getUserVehiclesForResponse(
                userDetails.getUser()
        );
    }

}
