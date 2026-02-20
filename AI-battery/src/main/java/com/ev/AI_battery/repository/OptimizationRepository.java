package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.ChargingOptimization;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OptimizationRepository extends JpaRepository<ChargingOptimization, Long> {
    List<ChargingOptimization> findTop10ByVehicleOrderByRecommendationTimestampDesc(Vehicle vehicle);
}
