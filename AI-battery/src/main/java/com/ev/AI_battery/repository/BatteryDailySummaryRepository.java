package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.BatteryDailySummary;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BatteryDailySummaryRepository
        extends JpaRepository<BatteryDailySummary, Long> {

    List<BatteryDailySummary>
    findByVehicleOrderByDateDesc(Vehicle vehicle);
}

