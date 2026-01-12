package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.VehicleRequest;
import com.ev.AI_battery.model.User;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.ev.AI_battery.dto.VehicleResponse;
import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;

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

                    return response;
                })
                .collect(Collectors.toList());
    }

}
