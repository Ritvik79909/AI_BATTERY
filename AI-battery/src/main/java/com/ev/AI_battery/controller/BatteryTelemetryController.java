package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.TelemetryDailySummary;
import com.ev.AI_battery.model.BatteryTelemetry;
import com.ev.AI_battery.model.ChargingState;
import com.ev.AI_battery.model.TelemetrySource;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.repository.BatteryTelemetryRepository;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/telemetry")
@RequiredArgsConstructor
public class BatteryTelemetryController {

    private final BatteryTelemetryService telemetryService;
    private final VehicleService vehicleService;
    private final DocumentTextExtractorService documentTextExtractorService; // Added
    private final TelemetryDocumentParser telemetryDocumentParser; // Added
    private final TelemetryCsvParser telemetryCsvParser; // Added (if used in uploadDataset)
    private final BatteryDailySummaryAggregationService dailySummaryAggregationService;
    private final BatteryTelemetryRepository telemetryRepository;

    @PostMapping("/ingest")
    public BatteryTelemetry ingestManual(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long vehicleId,
            @RequestBody BatteryTelemetry telemetry
    ) {
        Vehicle vehicle =
                vehicleService.getUserVehicleById(
                        userDetails.getUser(), vehicleId
                );

        telemetry.setSource(TelemetrySource.MANUAL);
        return telemetryService.ingest(vehicle, telemetry);
    }

    @GetMapping("/latest")
    public BatteryTelemetry latest(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long vehicleId
    ) {
        Vehicle vehicle =
                vehicleService.getUserVehicleById(
                        userDetails.getUser(), vehicleId
                );

        return telemetryService.latest(vehicle);
    }

    @GetMapping("/recent")
    public List<BatteryTelemetry> recent(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long vehicleId
    ) {
        Vehicle vehicle =
                vehicleService.getUserVehicleById(
                        userDetails.getUser(), vehicleId
                );

        return telemetryService.recent(vehicle);
    }

    @PostMapping("/upload/document")
    public List<BatteryTelemetry> uploadTelemetryDocument(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long vehicleId,
            @RequestParam MultipartFile file
    ) throws Exception {

        Vehicle vehicle =
                vehicleService.getUserVehicleById(
                        userDetails.getUser(), vehicleId
                );

        String text = documentTextExtractorService.extractText(file);
        List<BatteryTelemetry> parsed =
                telemetryDocumentParser.parse(text);

        parsed.forEach(t -> telemetryService.ingest(vehicle, t));
        dailySummaryAggregationService.refreshSummariesForTelemetry(vehicle, parsed);

        return parsed;
    }

    @PostMapping("/upload/dataset")
    public List<BatteryTelemetry> uploadDataset(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long vehicleId,
            @RequestParam MultipartFile file
    ) throws Exception {

        Vehicle vehicle =
                vehicleService.getUserVehicleById(
                        userDetails.getUser(), vehicleId
                );

        List<BatteryTelemetry> parsed =
                telemetryCsvParser.parse(file);

        parsed.forEach(t -> telemetryService.ingest(vehicle, t));
        dailySummaryAggregationService.refreshSummariesForTelemetry(vehicle, parsed);

        return parsed;
    }

    @GetMapping("/summary/daily")
    public TelemetryDailySummary dailySummary(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long vehicleId
    ) {
        Vehicle vehicle =
                vehicleService.getUserVehicleById(
                        userDetails.getUser(), vehicleId
                );

        return telemetryRepository.dailySummary(vehicle);
    }

    @PostMapping("/generate/sample")
    public BatteryTelemetry generateSample(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long vehicleId
    ) {
        Vehicle vehicle =
                vehicleService.getUserVehicleById(
                        userDetails.getUser(), vehicleId
                );

        BatteryTelemetry t = new BatteryTelemetry();
        t.setSoc(70 + Math.random() * 10);
        t.setTemperature(30 + Math.random() * 5);
        t.setVoltage(350 + Math.random() * 20);
        t.setCurrent(-10 + Math.random() * 5);
        t.setCycleCount(120);
        t.setChargingState(ChargingState.DISCHARGING);
        t.setSource(TelemetrySource.MANUAL);

        return telemetryService.ingest(vehicle, t);
    }


}

