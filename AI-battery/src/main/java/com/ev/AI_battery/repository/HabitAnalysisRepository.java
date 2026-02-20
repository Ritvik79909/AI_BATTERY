package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.ChargingHabitAnalysis;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HabitAnalysisRepository extends JpaRepository<ChargingHabitAnalysis, Long> {
    List<ChargingHabitAnalysis> findTop12ByVehicleOrderByAnalysisTimestampDesc(Vehicle vehicle);
}
