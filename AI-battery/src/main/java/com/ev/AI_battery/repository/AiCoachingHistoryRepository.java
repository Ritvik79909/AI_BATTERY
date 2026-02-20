package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.AiCoachingHistory;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AiCoachingHistoryRepository extends JpaRepository<AiCoachingHistory, Long> {
    List<AiCoachingHistory> findTop20ByVehicleOrderByTimestampDesc(Vehicle vehicle);
}
