package com.ev.AI_battery.service;

import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryTelemetryService {

    private final BatteryTelemetryRepository repository;
    private final TelemetryValidator validator;
    private final BatteryDataProcessingService processingService;

    public BatteryTelemetry ingest(Vehicle vehicle, BatteryTelemetry telemetry) {
        // ✅ CRITICAL: Ensure timestamp is always set (frontend might omit)
        if (telemetry.getTimestamp() == null) {
            telemetry.setTimestamp(LocalDateTime.now());
            log.info("Auto-set timestamp for telemetry: SOC={}, Temp={}",
                    telemetry.getSoc(), telemetry.getTemperature());
        }

        telemetry.setVehicle(vehicle);
        validator.validate(telemetry);

        // 1️⃣ Save raw telemetry
        BatteryTelemetry saved = repository.save(telemetry);
        log.debug("Saved raw telemetry ID={} at {}", saved.getId(), saved.getTimestamp());

        // 2️⃣ TRIGGER DAY-10 PROCESSING (inherits raw timestamp)
        processingService.process(saved, vehicle);

        return saved;
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
