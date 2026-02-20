package com.ev.AI_battery.service;

import com.ev.AI_battery.model.ProcessedBatteryTelemetry;
import org.springframework.stereotype.Service;

@Service
public class TelemetryCleaningService {

    public boolean isValid(ProcessedBatteryTelemetry t) {

        if (t.getTemperature() != null &&
                (t.getTemperature() < -30 || t.getTemperature() > 80)) {
            return false;
        }

        if (t.getVoltage() != null && t.getVoltage() < 0) {
            return false;
        }

        return true;
    }
}

