package com.ev.AI_battery.service;

import com.ev.AI_battery.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@Slf4j
public class TelemetryDocumentParser {

    public List<BatteryTelemetry> parse(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Telemetry document is empty");
        }

        List<BatteryTelemetry> records = new ArrayList<>();
        Map<String, String> currentBlock = new HashMap<>();

        String normalizedText = text
                .replace("\r\n", "\n")
                .replace("\r", "\n");

        int lineNumber = 0;
        for (String rawLine : normalizedText.split("\n")) {
            lineNumber++;
            String line = rawLine.trim();
            if (line.isEmpty()) {
                continue;
            }

            int separatorIdx = findSeparatorIndex(line);
            if (separatorIdx < 0) {
                continue;
            }

            String key = normalizeKey(line.substring(0, separatorIdx));
            String value = line.substring(separatorIdx + 1).trim();

            if (key.equals("timestamp") || key.equals("time") || key.equals("datetime")) {
                // New timestamp indicates a new block; flush previous if present.
                flushCurrentBlock(records, currentBlock, lineNumber);
                currentBlock.clear();
                currentBlock.put("timestamp", value);
                continue;
            }

            if (currentBlock.isEmpty()) {
                // Ignore lines before first timestamp block.
                continue;
            }

            if (key.equals("soc") || key.equals("stateofcharge")) {
                currentBlock.put("soc", value);
            } else if (key.equals("temperature") || key.equals("temp")) {
                currentBlock.put("temperature", value);
            } else if (key.equals("voltage") || key.equals("volt")) {
                currentBlock.put("voltage", value);
            } else if (key.equals("current") || key.equals("amp") || key.equals("amps")) {
                currentBlock.put("current", value);
            } else if (key.equals("cyclecount") || key.equals("cyclenumber") || key.equals("cycle") || key.equals("cycles")) {
                currentBlock.put("cycleCount", value);
            }
        }

        flushCurrentBlock(records, currentBlock, lineNumber);

        if (records.isEmpty()) {
            throw new IllegalArgumentException("No valid telemetry rows found in document. Check key names and values.");
        }

        return records;
    }

    private void flushCurrentBlock(List<BatteryTelemetry> records, Map<String, String> block, int lineNumber) {
        if (block.isEmpty()) {
            return;
        }

        if (!isCompleteBlock(block)) {
            log.warn("Skipping incomplete telemetry block near line {}: {}", lineNumber, block.keySet());
            return;
        }

        try {
            BatteryTelemetry t = new BatteryTelemetry();
            t.setTimestamp(parseTimestamp(block.get("timestamp")));
            t.setSoc(parseDouble(block.get("soc")));
            t.setTemperature(parseDouble(block.get("temperature")));
            t.setVoltage(parseDouble(block.get("voltage")));
            t.setCurrent(parseDouble(block.get("current")));
            t.setCycleCount(parseInt(block.get("cycleCount")));
            t.setChargingState(ChargingState.IDLE);
            t.setSource(TelemetrySource.DOCUMENT);
            records.add(t);
        } catch (Exception ex) {
            log.warn("Skipping invalid telemetry block near line {}: {}", lineNumber, ex.getMessage());
        }
    }

    private boolean isCompleteBlock(Map<String, String> block) {
        return block.containsKey("timestamp")
                && block.containsKey("soc")
                && block.containsKey("temperature")
                && block.containsKey("voltage")
                && block.containsKey("current")
                && block.containsKey("cycleCount");
    }

    private int findSeparatorIndex(String line) {
        int colonIdx = line.indexOf(':');
        int equalIdx = line.indexOf('=');

        if (colonIdx < 0) return equalIdx;
        if (equalIdx < 0) return colonIdx;
        return Math.min(colonIdx, equalIdx);
    }

    private String normalizeKey(String key) {
        return key.toLowerCase(Locale.ROOT)
                .replace("_", "")
                .replace(" ", "")
                .trim();
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

        for (DateTimeFormatter formatter : patterns) {
            try {
                return LocalDateTime.parse(value, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }

        throw new IllegalArgumentException("Unsupported timestamp format: " + value);
    }

    private Double parseDouble(String raw) {
        String value = stripQuotes(raw);
        if (value.isBlank()) {
            throw new IllegalArgumentException("numeric value is empty");
        }
        return Double.parseDouble(value);
    }

    private Integer parseInt(String raw) {
        String value = stripQuotes(raw);
        if (value.isBlank()) {
            throw new IllegalArgumentException("integer value is empty");
        }
        return Integer.parseInt(value);
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
}
