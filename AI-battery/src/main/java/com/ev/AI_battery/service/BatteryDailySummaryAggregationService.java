package com.ev.AI_battery.service;

import com.ev.AI_battery.model.BatteryDailySummary;
import com.ev.AI_battery.model.BatteryTelemetry;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.repository.BatteryDailySummaryRepository;
import com.ev.AI_battery.repository.BatteryTelemetryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryDailySummaryAggregationService {

    private final BatteryTelemetryRepository telemetryRepo;
    private final BatteryDailySummaryRepository dailyRepo;

    @Transactional
    public void refreshSummaryForTelemetryRecord(Vehicle vehicle, BatteryTelemetry telemetry) {
        if (telemetry == null || telemetry.getTimestamp() == null) {
            return;
        }
        refreshSummaryForDate(vehicle, telemetry.getTimestamp().toLocalDate());
    }

    @Transactional
    public void refreshSummariesForTelemetry(Vehicle vehicle, List<BatteryTelemetry> telemetryRows) {
        if (telemetryRows == null || telemetryRows.isEmpty()) {
            return;
        }

        Set<LocalDate> touchedDates = telemetryRows.stream()
                .map(BatteryTelemetry::getTimestamp)
                .filter(Objects::nonNull)
                .map(LocalDateTime::toLocalDate)
                .collect(Collectors.toSet());

        for (LocalDate date : touchedDates) {
            refreshSummaryForDate(vehicle, date);
        }
    }

    @Transactional
    public void refreshSummaryForDate(Vehicle vehicle, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        List<BatteryTelemetry> dayRows = telemetryRepo
                .findByVehicleAndTimestampBetweenOrderByTimestampAsc(vehicle, start, end);

        if (dayRows.isEmpty()) {
            return;
        }

        double avgSoc = average(dayRows.stream().map(BatteryTelemetry::getSoc).toList(), 75.0);
        double avgTemp = average(dayRows.stream().map(BatteryTelemetry::getTemperature).toList(), 25.0);
        double avgVoltage = average(dayRows.stream().map(BatteryTelemetry::getVoltage).toList(), 3.7);
        double avgCurrent = average(dayRows.stream().map(BatteryTelemetry::getCurrent).toList(), -1.5);
        int avgCycleCount = averageInt(dayRows.stream().map(BatteryTelemetry::getCycleCount).toList(), 1);

        BatteryDailySummary summary = dailyRepo.findByVehicleAndDate(vehicle, date)
                .orElseGet(BatteryDailySummary::new);

        summary.setVehicle(vehicle);
        summary.setDate(date);
        summary.setAvgSoc(round(avgSoc));
        // Schema currently has maxTemperature field; store daily average temperature for ML stability.
        summary.setMaxTemperature(round(avgTemp));
        summary.setAvgVoltage(round(avgVoltage));
        summary.setTotalChargeCurrent(round(avgCurrent));
        summary.setDailyCycleIncrement(Math.max(1, avgCycleCount));

        dailyRepo.save(summary);

        log.info("Updated daily summary for vehicle {} on {} -> SoC {}, Temp {}, Voltage {}, Current {}, Cycle {}",
                vehicle.getId(), date, summary.getAvgSoc(), summary.getMaxTemperature(),
                summary.getAvgVoltage(), summary.getTotalChargeCurrent(), summary.getDailyCycleIncrement());
    }

    private double average(List<Double> values, double fallback) {
        List<Double> clean = values.stream().filter(Objects::nonNull).toList();
        if (clean.isEmpty()) {
            return fallback;
        }
        return clean.stream().mapToDouble(Double::doubleValue).average().orElse(fallback);
    }

    private int averageInt(List<Integer> values, int fallback) {
        List<Integer> clean = values.stream().filter(Objects::nonNull).toList();
        if (clean.isEmpty()) {
            return fallback;
        }
        return (int) Math.round(clean.stream().mapToInt(Integer::intValue).average().orElse(fallback));
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}


