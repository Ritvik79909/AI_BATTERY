package com.ev.AI_battery.service;

import com.ev.AI_battery.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.HashMap;

@Service
@Slf4j
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
        int lineNumber = 0;
        ColumnMapping mapping = null;

        while ((line = reader.readLine()) != null) {
            lineNumber++;
            if (line.trim().isEmpty()) {
                continue;
            }

            String[] cols = line.split(",", -1);

            if (mapping == null) {
                mapping = resolveMapping(cols);
                if (mapping.headerRow) {
                    continue;
                }
            }

            try {
                BatteryTelemetry telemetry = new BatteryTelemetry();
                telemetry.setTimestamp(parseTimestamp(readCol(cols, mapping.timestampIdx)));
                telemetry.setSoc(parseDouble(readCol(cols, mapping.socIdx)));
                telemetry.setTemperature(parseDouble(readCol(cols, mapping.temperatureIdx)));
                telemetry.setVoltage(parseDouble(readCol(cols, mapping.voltageIdx)));
                telemetry.setCurrent(parseDouble(readCol(cols, mapping.currentIdx)));
                telemetry.setCycleCount(parseInt(readCol(cols, mapping.cycleIdx)));
                telemetry.setChargingState(parseChargingState(readCol(cols, mapping.stateIdx)));
                telemetry.setSource(TelemetrySource.DATASET);
                telemetryList.add(telemetry);
            } catch (Exception rowError) {
                log.warn("Skipping invalid telemetry CSV row {}: {}", lineNumber, rowError.getMessage());
            }
        }

        if (telemetryList.isEmpty()) {
            throw new IllegalArgumentException("No valid telemetry rows found in CSV. Check timestamp and column format.");
        }

        return telemetryList;
    }

    private ColumnMapping resolveMapping(String[] cols) {
        Map<String, Integer> header = new HashMap<>();
        for (int i = 0; i < cols.length; i++) {
            header.put(normalize(cols[i]), i);
        }

        boolean hasHeader = header.containsKey("timestamp") ||
                header.containsKey("time") ||
                header.containsKey("soc") ||
                header.containsKey("temperature") ||
                header.containsKey("voltage") ||
                header.containsKey("current") ||
                header.containsKey("cyclenumber") ||
                header.containsKey("cyclecount") ||
                header.containsKey("chargingstate");

        if (hasHeader) {
            return new ColumnMapping(
                    true,
                    findHeaderIndex(header, "timestamp", "time", "datetime"),
                    findHeaderIndex(header, "soc", "stateofcharge"),
                    findHeaderIndex(header, "temperature", "temp"),
                    findHeaderIndex(header, "voltage", "volt"),
                    findHeaderIndex(header, "current", "amp", "amps"),
                    findHeaderIndex(header, "cyclecount", "cyclenumber", "cycle", "cycles"),
                    findHeaderIndex(header, "chargingstate", "state", "mode")
            );
        }

        int base = 0;
        if (cols.length > 1 && looksLikeIndex(cols[0]) && !looksLikeDateTime(cols[0]) && looksLikeDateTime(cols[1])) {
            base = 1;
        }

        return new ColumnMapping(false, base, base + 1, base + 2, base + 3, base + 4, base + 5, base + 6);
    }

    private String readCol(String[] cols, int idx) {
        if (idx < 0 || idx >= cols.length) {
            return "";
        }
        return cols[idx].trim();
    }

    private int findHeaderIndex(Map<String, Integer> header, String... candidates) {
        for (String c : candidates) {
            Integer idx = header.get(c);
            if (idx != null) {
                return idx;
            }
        }
        return -1;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replace("_", "").replace(" ", "").trim();
    }

    private boolean looksLikeIndex(String value) {
        try {
            Integer.parseInt(stripQuotes(value));
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean looksLikeDateTime(String value) {
        try {
            parseTimestamp(value);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private LocalDateTime parseTimestamp(String raw) {
        String value = stripQuotes(raw);
        if (value.isBlank()) {
            throw new IllegalArgumentException("timestamp is empty");
        }

        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
        }

        try {
            return OffsetDateTime.parse(value).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.ofInstant(Instant.parse(value), ZoneId.systemDefault());
        } catch (DateTimeParseException ignored) {
        }

        if (value.matches("^-?\\d+$")) {
            long epoch = Long.parseLong(value);
            Instant instant = Math.abs(epoch) > 1_000_000_000_000L
                    ? Instant.ofEpochMilli(epoch)
                    : Instant.ofEpochSecond(epoch);
            return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
        }

        List<DateTimeFormatter> patterns = List.of(
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"),
                DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
                DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"),
                DateTimeFormatter.ofPattern("M/d/yyyy H:mm:ss"),
                DateTimeFormatter.ofPattern("M/d/yyyy H:mm")
        );

        for (DateTimeFormatter f : patterns) {
            try {
                return LocalDateTime.parse(value, f);
            } catch (DateTimeParseException ignored) {
            }
        }

        throw new IllegalArgumentException("Unsupported timestamp format: " + value);
    }

    private String stripQuotes(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.length() >= 2 && trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
            return trimmed.substring(1, trimmed.length() - 1);
        }
        return trimmed;
    }

    private Double parseDouble(String raw) {
        String value = stripQuotes(raw);
        if (value.isBlank()) {
            return null;
        }
        return Double.parseDouble(value);
    }

    private Integer parseInt(String raw) {
        String value = stripQuotes(raw);
        if (value.isBlank()) {
            return null;
        }
        return Integer.parseInt(value);
    }

    private ChargingState parseChargingState(String raw) {
        String value = stripQuotes(raw);
        if (value.isBlank()) {
            return ChargingState.IDLE;
        }
        try {
            return ChargingState.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return ChargingState.IDLE;
        }
    }

    private static class ColumnMapping {
        private final boolean headerRow;
        private final int timestampIdx;
        private final int socIdx;
        private final int temperatureIdx;
        private final int voltageIdx;
        private final int currentIdx;
        private final int cycleIdx;
        private final int stateIdx;

        private ColumnMapping(boolean headerRow,
                              int timestampIdx,
                              int socIdx,
                              int temperatureIdx,
                              int voltageIdx,
                              int currentIdx,
                              int cycleIdx,
                              int stateIdx) {
            this.headerRow = headerRow;
            this.timestampIdx = timestampIdx;
            this.socIdx = socIdx;
            this.temperatureIdx = temperatureIdx;
            this.voltageIdx = voltageIdx;
            this.currentIdx = currentIdx;
            this.cycleIdx = cycleIdx;
            this.stateIdx = stateIdx;
        }
    }
}
