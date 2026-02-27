package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.VehicleRequest;
import com.ev.AI_battery.dto.VehicleResponse;
import com.ev.AI_battery.model.User;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@Slf4j
public class VehicleController {

    private final VehicleService vehicleService;

    @GetMapping
    public ResponseEntity<?> getVehicles(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            // Debug logging
            log.debug("=== VehicleController.getVehicles() ===");
            log.debug("userDetails parameter: {}", userDetails);

            // Check SecurityContext directly
            Object principal = SecurityContextHolder.getContext().getAuthentication() != null
                    ? SecurityContextHolder.getContext().getAuthentication().getPrincipal()
                    : null;
            log.debug("SecurityContext principal: {}", principal);

            if (userDetails == null) {
                log.error("userDetails is null - authentication failed");
                log.debug("Full SecurityContext: {}", SecurityContextHolder.getContext());

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("User not authenticated");
            }

            User user = userDetails.getUser();
            if (user == null) {
                log.error("User object is null in userDetails");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("User data not found");
            }

            log.info("Fetching vehicles for user: {} (ID: {})", user.getEmail(), user.getUserId());

            List<VehicleResponse> vehicles = vehicleService.getUserVehiclesForResponse(user);

            log.info("Found {} vehicles for user", vehicles.size());

            return ResponseEntity.ok(vehicles);

        } catch (Exception e) {
            log.error("Error fetching vehicles: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching vehicles: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createVehicle(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody VehicleRequest request
    ) {
        try {
            if (userDetails == null || userDetails.getUser() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("User not authenticated");
            }

            User user = userDetails.getUser();
            Vehicle vehicle = vehicleService.createVehicle(user, request);
            return ResponseEntity.ok(vehicle);

        } catch (Exception e) {
            log.error("Error creating vehicle: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating vehicle: " + e.getMessage());
        }
    }
}