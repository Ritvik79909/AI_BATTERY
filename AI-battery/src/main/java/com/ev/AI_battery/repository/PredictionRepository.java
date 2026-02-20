package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.BatteryHealthPrediction;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PredictionRepository extends JpaRepository<BatteryHealthPrediction, Long> {
    List<BatteryHealthPrediction> findTop20ByVehicleOrderByPredictionTimestampDesc(Vehicle vehicle);

    @Query("SELECT p FROM BatteryHealthPrediction p WHERE p.vehicle = :vehicle ORDER BY p.predictionTimestamp DESC")
    List<BatteryHealthPrediction> findRulHistoryByVehicle(@Param("vehicle") Vehicle vehicle);
}

