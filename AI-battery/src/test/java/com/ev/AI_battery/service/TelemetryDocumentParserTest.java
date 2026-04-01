package com.ev.AI_battery.service;

import com.ev.AI_battery.model.BatteryTelemetry;
import com.ev.AI_battery.model.ChargingState;
import com.ev.AI_battery.model.TelemetrySource;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TelemetryDocumentParserTest {

    private final TelemetryDocumentParser parser = new TelemetryDocumentParser();

    @Test
    void parsesRepeatedBlocksInProvidedFormat() {
        String input = "timestamp: 2025-11-02T10:00:00\n" +
                "soc: 78\n" +
                "temperature: 28\n" +
                "voltage: 395\n" +
                "current: -42\n" +
                "cycleCount: 1\n" +
                "timestamp: 2025-11-05T11:30:00\n" +
                "soc: 65\n" +
                "temperature: 30\n" +
                "voltage: 388\n" +
                "current: -35\n" +
                "cycleCount: 2\n";

        List<BatteryTelemetry> rows = parser.parse(input);

        assertEquals(2, rows.size());
        assertEquals(78.0, rows.get(0).getSoc());
        assertEquals(388.0, rows.get(1).getVoltage());
        assertEquals(ChargingState.IDLE, rows.get(0).getChargingState());
        assertEquals(TelemetrySource.DOCUMENT, rows.get(0).getSource());
    }

    @Test
    void parsesWithWindowsLineEndingsAndEqualsSign() {
        String input = "timestamp = 2025-11-08T09:15:00\r\n" +
                "soc = 52\r\n" +
                "temperature = 27\r\n" +
                "voltage = 380\r\n" +
                "current = -10\r\n" +
                "cycleCount = 2\r\n";

        List<BatteryTelemetry> rows = parser.parse(input);

        assertEquals(1, rows.size());
        assertEquals(52.0, rows.get(0).getSoc());
        assertEquals(-10.0, rows.get(0).getCurrent());
        assertEquals(2, rows.get(0).getCycleCount());
    }

    @Test
    void throwsWhenNoValidBlocksFound() {
        String invalid = "timestamp: bad-date\n" +
                "soc: text\n" +
                "temperature: 30\n";

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> parser.parse(invalid));
        assertTrue(ex.getMessage().contains("No valid telemetry rows"));
    }
}

