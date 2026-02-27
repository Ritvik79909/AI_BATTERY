package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.AnomalyAlert;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AnomalyAlertRepository extends JpaRepository<AnomalyAlert, Long> {

    List<AnomalyAlert> findByVehicleAndStatusOrderByTimestampDesc(Vehicle vehicle, String status);

    List<AnomalyAlert> findByVehicleOrderByTimestampDesc(Vehicle vehicle);

    @Query("SELECT a FROM AnomalyAlert a WHERE a.vehicle = :vehicle AND a.timestamp > :since")
    List<AnomalyAlert> findRecentByVehicle(@Param("vehicle") Vehicle vehicle, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(a) FROM AnomalyAlert a WHERE a.vehicle = :vehicle AND a.status = 'ACTIVE'")
    long countActiveAlerts(@Param("vehicle") Vehicle vehicle);
}