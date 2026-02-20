package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.ChargingSession;
import com.ev.AI_battery.model.TelemetrySource;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChargingSessionRepository extends JpaRepository<ChargingSession, Long> {
    List<ChargingSession> findByVehicleOrderByStartTimeDesc(Vehicle vehicle);
    List<ChargingSession> findTop10ByVehicleOrderByStartTimeDesc(Vehicle vehicle);
    List<ChargingSession> findByVehicleAndSourceOrderByStartTimeDesc(Vehicle vehicle, TelemetrySource source);
}
