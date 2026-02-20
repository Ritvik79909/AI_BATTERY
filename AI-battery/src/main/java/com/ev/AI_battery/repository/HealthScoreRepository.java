package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.BatteryHealthScore;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HealthScoreRepository extends JpaRepository<BatteryHealthScore, Long> {
    List<BatteryHealthScore> findTop30ByVehicleOrderByTimestampDesc(Vehicle vehicle);
}
