package com.ev.AI_battery.service;

import com.ev.AI_battery.model.BatteryTelemetry;
import com.ev.AI_battery.model.ProcessedBatteryTelemetry;
import com.ev.AI_battery.model.Vehicle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TelemetryNormalizationService {

    public ProcessedBatteryTelemetry normalize(
            BatteryTelemetry raw,
            Vehicle vehicle
    ) {
        ProcessedBatteryTelemetry p = new ProcessedBatteryTelemetry();

        p.setVehicle(vehicle);
        p.setTimestamp(raw.getTimestamp());
        p.setSource(raw.getSource());

        // SoC normalization
        double soc = raw.getSoc() == null ? -1 : raw.getSoc();
        soc = Math.max(0, Math.min(100, soc));
        p.setSoc(soc);

        // Temperature (assume °C, extendable later)
        p.setTemperature(raw.getTemperature());

        // Voltage normalization (basic for now)
        p.setVoltage(raw.getVoltage());

        // Current sign standardization
        if (raw.getCurrent() != null) {
            p.setCurrent(raw.getCurrent());
        }

        p.setChargingState(raw.getChargingState());

        // Data quality
        boolean complete =
                raw.getSoc() != null &&
                        raw.getTemperature() != null &&
                        raw.getVoltage() != null;

        p.setIsComplete(complete);
        p.setDataQualityScore(complete ? 1.0 : 0.6);

        return p;
    }
}

