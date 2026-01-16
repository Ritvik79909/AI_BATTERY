package com.ev.AI_battery.service;

import com.ev.AI_battery.model.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.*;

@Service
public class TelemetryDocumentParser {

    public List<BatteryTelemetry> parse(String text) {

        List<BatteryTelemetry> records = new ArrayList<>();

        Pattern rowPattern = Pattern.compile(
                "timestamp\\s*[:=]\\s*(.+?)\\n" +
                        "soc\\s*[:=]\\s*(\\d+(\\.\\d+)?)\\n" +
                        "temperature\\s*[:=]\\s*(\\d+(\\.\\d+)?)\\n" +
                        "voltage\\s*[:=]\\s*(\\d+(\\.\\d+)?)\\n" +
                        "current\\s*[:=]\\s*(-?\\d+(\\.\\d+)?)\\n" +
                        "cycleCount\\s*[:=]\\s*(\\d+)",
                Pattern.CASE_INSENSITIVE
        );

        Matcher matcher = rowPattern.matcher(text);

        while (matcher.find()) {
            BatteryTelemetry t = new BatteryTelemetry();
            t.setTimestamp(LocalDateTime.parse(matcher.group(1)));
            t.setSoc(Double.valueOf(matcher.group(2)));
            t.setTemperature(Double.valueOf(matcher.group(4)));
            t.setVoltage(Double.valueOf(matcher.group(6)));
            t.setCurrent(Double.valueOf(matcher.group(8)));
            t.setCycleCount(Integer.valueOf(matcher.group(10)));
            t.setChargingState(ChargingState.IDLE);
            t.setSource(TelemetrySource.DOCUMENT);
            records.add(t);
        }

        return records;
    }
}
