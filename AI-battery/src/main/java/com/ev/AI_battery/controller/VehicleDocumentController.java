package com.ev.AI_battery.controller;

import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/vehicles/documents")
@RequiredArgsConstructor
public class VehicleDocumentController {

    private final VehicleService vehicleService;

    @PostMapping("/upload")
    public Vehicle uploadVehicleDocument(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("file") MultipartFile file
    ) throws Exception {

        return vehicleService.createVehicleFromDocument(
                userDetails.getUser(),
                file
        );
    }
}
