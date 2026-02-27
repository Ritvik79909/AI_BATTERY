package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.BatteryExplanation;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BatteryExplanationRepository extends JpaRepository<BatteryExplanation, Long> {
    List<BatteryExplanation> findTop10ByVehicleOrderByTimestampDesc(Vehicle vehicle);
    BatteryExplanation findTop1ByVehicleOrderByTimestampDesc(Vehicle vehicle);
}