package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.User;
import com.ev.AI_battery.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByUser(User user);
}
