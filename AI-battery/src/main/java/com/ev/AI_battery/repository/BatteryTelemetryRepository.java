package com.ev.AI_battery.repository;

import com.ev.AI_battery.dto.TelemetryDailySummary;
import com.ev.AI_battery.model.BatteryTelemetry;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface BatteryTelemetryRepository
        extends JpaRepository<BatteryTelemetry, Long> {

    List<BatteryTelemetry>
    findTop20ByVehicleOrderByTimestampDesc(Vehicle vehicle);

    BatteryTelemetry
    findTop1ByVehicleOrderByTimestampDesc(Vehicle vehicle);

    List<BatteryTelemetry>
    findByVehicleAndTimestampBetweenOrderByTimestampAsc(
            Vehicle vehicle,
            LocalDateTime start,
            LocalDateTime end
    );

    @Query("""
    SELECT new com.ev.AI_battery.dto.TelemetryDailySummary(
        AVG(t.soc), MIN(t.soc), MAX(t.soc), AVG(t.temperature)
    )
    FROM BatteryTelemetry t
    WHERE t.vehicle = :vehicle
    """)
    TelemetryDailySummary dailySummary(Vehicle vehicle);

}
