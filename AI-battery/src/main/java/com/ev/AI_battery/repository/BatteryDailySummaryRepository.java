package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.BatteryDailySummary;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BatteryDailySummaryRepository
        extends JpaRepository<BatteryDailySummary, Long> {

    List<BatteryDailySummary>
    findByVehicleOrderByDateDesc(Vehicle vehicle);

    Optional<BatteryDailySummary>
    findByVehicleAndDate(Vehicle vehicle, LocalDate date);
}

