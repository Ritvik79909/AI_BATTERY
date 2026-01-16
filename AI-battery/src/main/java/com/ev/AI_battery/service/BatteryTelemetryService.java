package com.ev.AI_battery.service;

import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BatteryTelemetryService {

    private final BatteryTelemetryRepository repository;
    private final TelemetryValidator validator;

    public BatteryTelemetry ingest(
            Vehicle vehicle,
            BatteryTelemetry telemetry
    ) {
        telemetry.setVehicle(vehicle);

        if (telemetry.getTimestamp() == null) {
            telemetry.setTimestamp(LocalDateTime.now());
        }

        validator.validate(telemetry);
        return repository.save(telemetry);
    }

    public BatteryTelemetry latest(Vehicle vehicle) {
        return repository
                .findTop1ByVehicleOrderByTimestampDesc(vehicle);
    }

    public List<BatteryTelemetry> recent(Vehicle vehicle) {
        return repository
                .findTop20ByVehicleOrderByTimestampDesc(vehicle);
    }
}
