package com.ev.AI_battery.controller;

import com.ev.AI_battery.dto.HealthScoreResponse;
import com.ev.AI_battery.dto.RULResponse;
import com.ev.AI_battery.dto.SimulatedHealthResponse;
import com.ev.AI_battery.dto.SoHResponse;
import com.ev.AI_battery.model.BatteryDailySummary;
import com.ev.AI_battery.model.BatteryHealthPrediction;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.repository.BatteryDailySummaryRepository;
import com.ev.AI_battery.repository.PredictionRepository;
import com.ev.AI_battery.security.CustomUserDetails;
import com.ev.AI_battery.service.BatteryHealthService;
import com.ev.AI_battery.service.BatteryMlService;
import com.ev.AI_battery.service.HealthScoreService;
import com.ev.AI_battery.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/battery-health")
@RequiredArgsConstructor
@Slf4j
public class BatteryHealthController {

    private final BatteryHealthService service;
    private final VehicleService vehicleService;

    @Autowired
    private BatteryMlService mlService;

    @Autowired
    private BatteryDailySummaryRepository dailyRepo;

    @Autowired
    private PredictionRepository predictionRepo;

    @Autowired
    private HealthScoreService healthScoreService;

    @GetMapping("/soh/{vehicleId}")
    public SoHResponse getSoH(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        BatteryDailySummary latest = getLatestSummaryOrDefault(vehicle);

        SimulatedHealthResponse mlResult = mlService.predict(vehicle, latest);

        return new SoHResponse(
                mlResult.getSoh(),
                mlResult.getSource().equals("ML_MODEL_DATASET") ? "AI Predicted" : "Healthy",
                LocalDateTime.now()
        );
    }

    @GetMapping("/soh-history/{vehicleId}")
    public List<BatteryHealthPrediction> getSoHHistory(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return predictionRepo.findTop20ByVehicleOrderByPredictionTimestampDesc(vehicle);
    }


    @GetMapping("/rul/{vehicleId}")
    public RULResponse rul(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId
    ) {
        Vehicle v = vehicleService.getUserVehicleById(
                user.getUser(), vehicleId
        );

        return service.getRUL(v);
    }

    @GetMapping("/rul-history/{vehicleId}")
    public List<BatteryHealthPrediction> getRulHistory(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return predictionRepo.findTop20ByVehicleOrderByPredictionTimestampDesc(vehicle);
    }

    @GetMapping("/score/{vehicleId}")
    public HealthScoreResponse getScore(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        return healthScoreService.calculateScore(vehicle);
    }

    private BatteryDailySummary getLatestSummaryOrDefault(Vehicle vehicle) {
        List<BatteryDailySummary> summaries = dailyRepo.findByVehicleOrderByDateDesc(vehicle);
        if (summaries.isEmpty()) {
            log.warn("No battery daily summaries found for vehicle {}. Returning default values.", vehicle.getId());
            BatteryDailySummary mock = new BatteryDailySummary();
            mock.setMaxTemperature(25.0);
            mock.setDailyCycleIncrement(1);
            mock.setAvgVoltage(3.7);
            mock.setAvgSoc(75.0);
            mock.setTotalChargeCurrent(0.0);
            return mock;
        }
        return summaries.get(0);
    }

    @GetMapping("/simulated/{vehicleId}")
    public SimulatedHealthResponse simulatedHealth(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable Long vehicleId) {

        Vehicle vehicle = vehicleService.getUserVehicleById(user.getUser(), vehicleId);
        BatteryDailySummary latest = getLatestSummaryOrDefault(vehicle);  // From your existing fix

        return mlService.predict(vehicle, latest);
    }

}
