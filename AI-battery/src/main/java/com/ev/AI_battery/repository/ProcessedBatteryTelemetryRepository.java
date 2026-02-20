package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.ProcessedBatteryTelemetry;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProcessedBatteryTelemetryRepository
        extends JpaRepository<ProcessedBatteryTelemetry, Long> {

    ProcessedBatteryTelemetry
    findTop1ByVehicleOrderByTimestampDesc(Vehicle vehicle);

    List<ProcessedBatteryTelemetry>
    findByVehicleOrderByTimestampDesc(Vehicle vehicle);
}

