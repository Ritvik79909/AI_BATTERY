package com.ev.AI_battery.service;

import com.ev.AI_battery.model.BatteryTelemetry;
import org.springframework.stereotype.Service;

@Service
public class TelemetryValidator {

    public void validate(BatteryTelemetry t) {

        if (t.getSoc() != null &&
                (t.getSoc() < 0 || t.getSoc() > 100)) {
            throw new RuntimeException("SoC must be between 0 and 100");
        }

        if (t.getTemperature() != null &&
                (t.getTemperature() < -40 || t.getTemperature() > 100)) {
            throw new RuntimeException("Invalid battery temperature");
        }

        if (t.getVoltage() != null && t.getVoltage() < 0) {
            throw new RuntimeException("Voltage cannot be negative");
        }
    }
}
