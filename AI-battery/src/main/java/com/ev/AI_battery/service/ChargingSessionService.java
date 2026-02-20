package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.ChargingSessionRequest;
import com.ev.AI_battery.dto.ChargingSummary;
import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.ChargingSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChargingSessionService {
    private final ChargingSessionRepository repo;

    public ChargingSession logSession(Vehicle vehicle, ChargingSessionRequest req) {
        ChargingSession session = new ChargingSession();
        session.setVehicle(vehicle);
        session.setStartTime(req.getStartTime());
        session.setEndTime(req.getEndTime());
        session.setStartSoc(req.getStartSoc());
        session.setEndSoc(req.getEndSoc());
        session.setChargingType(req.getChargingType());
        session.setSource(TelemetrySource.MANUAL);
        session.setLocation(ChargingLocation.PUBLIC); // Default

        // Auto-calculate fields
        session.setDurationMinutes(ChronoUnit.MINUTES.between(
                req.getStartTime(), req.getEndTime()));
        session.setSocAdded(req.getEndSoc() - req.getStartSoc());
        session.setEnergyAddedKwh(calculateEnergyAdded(req)); // Impl below

        log.info("Logged charging session for vehicle {}: {}min, {}% added",
                vehicle.getId(), session.getDurationMinutes(), session.getSocAdded());

        return repo.save(session);
    }

    public List<ChargingSession> getHistory(Vehicle vehicle) {
        return repo.findByVehicleOrderByStartTimeDesc(vehicle);
    }

    public List<ChargingSession> getRecent(Vehicle vehicle) {
        return repo.findTop10ByVehicleOrderByStartTimeDesc(vehicle);
    }

    public ChargingSummary getSummary(Vehicle vehicle) {
        List<ChargingSession> all = getHistory(vehicle);
        if (all.isEmpty()) return new ChargingSummary();

        long totalSessions = all.size();
        double totalDuration = all.stream().mapToLong(ChargingSession::getDurationMinutes).sum();
        long fastCount = all.stream().filter(s -> s.getChargingType() == ChargingType.DC_FAST)
                .count();

        ChargingSummary summary = new ChargingSummary();
        summary.setTotalSessions((int)totalSessions);
        summary.setAvgDurationMinutes(totalDuration / totalSessions);
        summary.setFastChargingPercentage((double)fastCount / totalSessions * 100);
        summary.setAvgEnergyAddedKwh(all.stream().mapToDouble(ChargingSession::getEnergyAddedKwh).average().orElse(0));

        return summary;
    }

    private double calculateEnergyAdded(ChargingSessionRequest req) {
        // Simplified: SoC% * battery capacity (from vehicle) / 100
        // Full impl would use vehicle.batteryCapacityKwh
        return (req.getEndSoc() - req.getStartSoc()) * 0.7; // 70kWh battery assumption
    }
}
