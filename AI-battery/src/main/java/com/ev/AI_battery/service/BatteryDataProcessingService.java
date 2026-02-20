package com.ev.AI_battery.service;

import com.ev.AI_battery.model.BatteryTelemetry;
import com.ev.AI_battery.model.ProcessedBatteryTelemetry;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.repository.ProcessedBatteryTelemetryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryDataProcessingService {

    private final TelemetryNormalizationService normalizer;
    private final TelemetryCleaningService cleaner;
    private final ProcessedBatteryTelemetryRepository processedRepo;

    public void process(BatteryTelemetry raw, Vehicle vehicle) {
        // ✅ PRESERVE RAW TIMESTAMP - critical for time-series ordering
        ProcessedBatteryTelemetry processed = normalizer.normalize(raw, vehicle);
        processed.setTimestamp(raw.getTimestamp());  // Explicitly copy timestamp

        log.debug("Processing raw ID={} timestamp={} → processed",
                raw.getId(), raw.getTimestamp());

        if (cleaner.isValid(processed)) {
            ProcessedBatteryTelemetry saved = processedRepo.save(processed);
            log.debug("Saved processed telemetry ID={} at {}", saved.getId(), saved.getTimestamp());
        } else {
            log.warn("Skipped invalid processed data from raw ID={}", raw.getId());
        }
    }
}
