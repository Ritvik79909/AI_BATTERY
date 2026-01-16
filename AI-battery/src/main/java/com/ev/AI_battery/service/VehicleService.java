package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.VehicleRequest;
import com.ev.AI_battery.model.User;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.model.VehicleType;
import com.ev.AI_battery.repository.VehicleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.ev.AI_battery.dto.VehicleResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final DocumentTextExtractorService documentTextExtractorService;
    private final VehicleDocumentParser vehicleDocumentParser;


    public Vehicle createVehicle(User user, VehicleRequest req) {

        Vehicle vehicle = new Vehicle();

        // Ownership
        vehicle.setUser(user);

        // Core identifiers
        vehicle.setNickname(req.getNickname());
        vehicle.setMake(req.getMake());
        vehicle.setModel(req.getModel());
        vehicle.setVariant(req.getVariant());
        vehicle.setYear(req.getYear());
        vehicle.setVin(req.getVin());

        // Battery details
        vehicle.setBatteryCapacityKwh(req.getBatteryCapacityKwh());
        vehicle.setUsableCapacityKwh(req.getUsableCapacityKwh());
        vehicle.setChemistry(req.getChemistry());
        vehicle.setRatedRangeKm(req.getRatedRangeKm());

        // Charging capability
        vehicle.setFastChargeSupported(req.getFastChargeSupported());
        vehicle.setMaxAcPowerKw(req.getMaxAcPowerKw());
        vehicle.setMaxDcPowerKw(req.getMaxDcPowerKw());

        vehicle.setVehicleType(
                req.getVehicleType() != null
                        ? req.getVehicleType()
                        : VehicleType.CAR
        );


        return vehicleRepository.save(vehicle);
    }

    public List<VehicleResponse> getUserVehiclesForResponse(User user) {

        return vehicleRepository.findByUser(user)
                .stream()
                .map(vehicle -> {
                    VehicleResponse response = new VehicleResponse();

                    response.setId(vehicle.getId());
                    response.setNickname(vehicle.getNickname());
                    response.setMake(vehicle.getMake());
                    response.setModel(vehicle.getModel());
                    response.setVariant(vehicle.getVariant());
                    response.setYear(vehicle.getYear());
                    response.setVin(vehicle.getVin());

                    response.setBatteryCapacityKwh(vehicle.getBatteryCapacityKwh());
                    response.setUsableCapacityKwh(vehicle.getUsableCapacityKwh());
                    response.setChemistry(vehicle.getChemistry());
                    response.setRatedRangeKm(vehicle.getRatedRangeKm());

                    response.setFastChargeSupported(vehicle.getFastChargeSupported());
                    response.setMaxAcPowerKw(vehicle.getMaxAcPowerKw());
                    response.setMaxDcPowerKw(vehicle.getMaxDcPowerKw());

                    response.setIsDefault(vehicle.getIsDefault());

                    response.setVehicleType(vehicle.getVehicleType());

                    return response;
                })
                .collect(Collectors.toList());
    }

    public Vehicle createVehicleFromDocument(
            User user,
            MultipartFile file
    ) throws Exception {

        String extractedText =
                documentTextExtractorService.extractText(file);

        Vehicle extractedVehicle =
                vehicleDocumentParser.parse(extractedText);

        // Ownership
        extractedVehicle.setUser(user);

        // Defaults
        if (extractedVehicle.getNickname() == null ||
                extractedVehicle.getNickname().isBlank()) {
            extractedVehicle.setNickname("Uploaded Vehicle");
        }
        extractedVehicle.setIsDefault(false);

        if (extractedVehicle.getVehicleType() == null) {
            extractedVehicle.setVehicleType(VehicleType.CAR);
        }

        return vehicleRepository.save(extractedVehicle);
    }

    // Add this method to VehicleService.java
    public Vehicle getUserVehicleById(User user, Long vehicleId) {
        return vehicleRepository.findByUserAndId(user, vehicleId)
                .orElseThrow(() -> new EntityNotFoundException("Vehicle not found or not owned by user"));
    }

}
