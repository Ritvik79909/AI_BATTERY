package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.VehicleRequest;
import com.ev.AI_battery.model.User;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    public Vehicle createVehicle(User user, VehicleRequest req) {
        Vehicle v = new Vehicle();
        v.setUser(user);
        v.setNickname(req.nickname);
        v.setMake(req.make);
        v.setModel(req.model);
        v.setVariant(req.variant);
        v.setYear(req.year);
        v.setVin(req.vin);
        v.setBatteryCapacityKwh(req.batteryCapacityKwh);
        v.setChemistry(req.chemistry);
        v.setFastChargeSupported(req.fastChargeSupported);
        return vehicleRepository.save(v);
    }

    public List<Vehicle> getUserVehicles(User user) {
        return vehicleRepository.findByUser(user);
    }
}
