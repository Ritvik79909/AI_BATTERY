package com.ev.AI_battery.service;

import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.model.VehicleType;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class VehicleDocumentParser {

    public Vehicle parse(String rawText) {

        Vehicle vehicle = new Vehicle();
        String text = rawText;

        vehicle.setNickname(extractString(text, "nickname"));
        vehicle.setMake(extractString(text, "make"));
        vehicle.setModel(extractString(text, "model"));
        vehicle.setVariant(extractString(text, "variant"));

        vehicle.setYear(extractInteger(text, "year"));
        vehicle.setVin(extractVin(text));

        vehicle.setBatteryCapacityKwh(
                extractDouble(text, "batteryCapacityKwh")
        );

        vehicle.setUsableCapacityKwh(
                extractDouble(text, "usableCapacityKwh")
        );

        vehicle.setRatedRangeKm(
                extractDouble(text, "ratedRangeKm")
        );

        vehicle.setChemistry(
                extractChemistry(text)
        );

        vehicle.setFastChargeSupported(
                extractBoolean(text, "fastChargeSupported")
        );

        vehicle.setMaxAcPowerKw(
                extractDouble(text, "maxAcPowerKw")
        );

        vehicle.setMaxDcPowerKw(
                extractDouble(text, "maxDcPowerKw")
        );

        vehicle.setVehicleType(extractVehicleType(text));

        return vehicle;
    }

    /* ---------- Helper Methods ---------- */

    private String extractString(String text, String key) {
        Matcher m = Pattern.compile(
                key + "\\s*[:=]\\s*\"?([A-Za-z0-9 ._-]+)\"?",
                Pattern.CASE_INSENSITIVE
        ).matcher(text);
        return m.find() ? m.group(1).trim() : null;
    }

    private Double extractDouble(String text, String key) {
        Matcher m = Pattern.compile(
                key + "\\s*[:=]\\s*(\\d+(\\.\\d+)?)",
                Pattern.CASE_INSENSITIVE
        ).matcher(text);
        return m.find() ? Double.valueOf(m.group(1)) : null;
    }

    private Integer extractInteger(String text, String key) {
        Matcher m = Pattern.compile(
                key + "\\s*[:=]\\s*(\\d{4})",
                Pattern.CASE_INSENSITIVE
        ).matcher(text);
        return m.find() ? Integer.valueOf(m.group(1)) : null;
    }

    private Boolean extractBoolean(String text, String key) {
        Matcher m = Pattern.compile(
                key + "\\s*[:=]\\s*(true|false)",
                Pattern.CASE_INSENSITIVE
        ).matcher(text);
        return m.find() && Boolean.parseBoolean(m.group(1));
    }

    private String extractVin(String text) {
        Matcher m = Pattern.compile(
                "\\b[A-HJ-NPR-Z0-9]{17}\\b",
                Pattern.CASE_INSENSITIVE
        ).matcher(text);
        return m.find() ? m.group() : null;
    }

    private String extractChemistry(String text) {
        Matcher m = Pattern.compile(
                "chemistry\\s*[:=]\\s*\"?([A-Za-z ()]+)\"?",
                Pattern.CASE_INSENSITIVE
        ).matcher(text);
        return m.find() ? m.group(1).trim() : null;
    }

    private VehicleType extractVehicleType(String text) {

        text = text.toLowerCase();

        if (text.contains("bike") || text.contains("motorcycle")) {
            return VehicleType.BIKE;
        }

        if (text.contains("scooter") || text.contains("scooty")) {
            return VehicleType.SCOOTY;
        }

        return VehicleType.CAR; // default
    }

}
