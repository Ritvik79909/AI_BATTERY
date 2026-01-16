package com.ev.AI_battery.service;

import com.ev.AI_battery.model.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class TelemetryCsvParser {

    /**
     * Expected CSV format:
     * timestamp,soc,temperature,voltage,current,cycleCount,chargingState
     *
     * Example:
     * 2026-01-10T10:30:00,75,32,380,-15,120,DISCHARGING
     */
    public List<BatteryTelemetry> parse(MultipartFile file) throws Exception {

        List<BatteryTelemetry> telemetryList = new ArrayList<>();

        BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream())
        );

        String line;
        boolean headerSkipped = false;

        while ((line = reader.readLine()) != null) {

            // Skip header
            if (!headerSkipped) {
                headerSkipped = true;
                continue;
            }

            String[] cols = line.split(",");

            BatteryTelemetry telemetry = new BatteryTelemetry();
            telemetry.setTimestamp(LocalDateTime.parse(cols[0].trim()));
            telemetry.setSoc(Double.parseDouble(cols[1].trim()));
            telemetry.setTemperature(Double.parseDouble(cols[2].trim()));
            telemetry.setVoltage(Double.parseDouble(cols[3].trim()));
            telemetry.setCurrent(Double.parseDouble(cols[4].trim()));
            telemetry.setCycleCount(Integer.parseInt(cols[5].trim()));
            telemetry.setChargingState(
                    ChargingState.valueOf(cols[6].trim())
            );
            telemetry.setSource(TelemetrySource.DATASET);

            telemetryList.add(telemetry);
        }

        return telemetryList;
    }
}
