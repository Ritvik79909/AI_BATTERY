package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.*;
import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StationRecommendationService {

    private final ChargingStationRepository stationRepository;
    private final LocationService locationService;
    private final StationRankingService rankingService;
    private final OpenChargeMapService openChargeMapService; // Changed from NrelApiService
    private final VehicleService vehicleService;
    private final BatteryHealthService healthService;

    /**
     * Get station recommendations based on user request
     * ALWAYS fetches fresh data from API first, uses database as cache/fallback
     */
    public List<StationRecommendationResponse> getRecommendations(
            StationRecommendationRequest request,
            User user) {

        log.info("Getting station recommendations for user: {}, lat: {}, lon: {}",
                user.getEmail(), request.getLatitude(), request.getLongitude());

        List<ChargingStation> stations = new ArrayList<>();

        try {
            // STEP 1: ALWAYS try to fetch from Open Charge Map API first (real-time data)
            log.info("Fetching real-time stations from Open Charge Map API...");
            List<ChargingStation> apiStations = openChargeMapService.fetchStationsFromOCM(
                    request.getLatitude(),
                    request.getLongitude(),
                    request.getRadiusKm()
            );

            if (apiStations != null && !apiStations.isEmpty()) {
                log.info("Found {} real-time stations from API", apiStations.size());

                // Save API stations to database for future use (as cache)
                try {
                    // Filter out duplicates before saving
                    List<ChargingStation> newStations = new ArrayList<>();
                    for (ChargingStation apiStation : apiStations) {
                        boolean exists = stationRepository.findStationsWithinRadius(
                                apiStation.getLatitude(),
                                apiStation.getLongitude(),
                                0.1 // Within 100 meters
                        ).isEmpty();

                        if (exists) {
                            newStations.add(apiStation);
                        }
                    }

                    if (!newStations.isEmpty()) {
                        stationRepository.saveAll(newStations);
                        log.info("Cached {} new stations to database", newStations.size());
                    }
                } catch (Exception e) {
                    log.warn("Failed to cache stations to database: {}", e.getMessage());
                }

                // Use API stations as primary source
                stations = apiStations;
            } else {
                log.warn("API returned no stations, falling back to database...");
                // STEP 2: If API fails or returns no stations, use database as fallback
                stations = stationRepository.findStationsWithinRadius(
                        request.getLatitude(),
                        request.getLongitude(),
                        request.getRadiusKm()
                );
                log.info("Found {} stations in database as fallback", stations.size());
            }

        } catch (Exception e) {
            log.error("Error fetching from API: {}, falling back to database", e.getMessage());
            // STEP 3: If API call fails, use database as fallback
            try {
                stations = stationRepository.findStationsWithinRadius(
                        request.getLatitude(),
                        request.getLongitude(),
                        request.getRadiusKm()
                );
                log.info("Found {} stations in database as fallback after API error", stations.size());
            } catch (Exception dbEx) {
                log.error("Database fallback also failed: {}", dbEx.getMessage());
                return new ArrayList<>();
            }
        }

        // If still no stations, return empty list with explanation
        if (stations.isEmpty()) {
            log.warn("No stations found near location: {}, {}", request.getLatitude(), request.getLongitude());
            return new ArrayList<>();
        }

        // Get vehicle for context-aware recommendations
        Vehicle vehicle = null;
        if (request.getVehicleId() != null) {
            try {
                vehicle = vehicleService.getUserVehicleById(user, request.getVehicleId());
            } catch (Exception e) {
                log.warn("Could not get vehicle: {}", e.getMessage());
            }
        }

        // Create effectively final copies
        final StationRecommendationRequest finalRequest = request;
        final Vehicle finalVehicle = vehicle;

        // Apply filters and calculate scores
        List<StationRecommendationResponse> responses = stations.stream()
                .filter(station -> {
                    try {
                        return applyFilters(station, finalRequest, finalVehicle);
                    } catch (Exception e) {
                        log.warn("Error applying filters to station {}: {}",
                                station.getId(), e.getMessage());
                        return false;
                    }
                })
                .map(station -> {
                    try {
                        return createResponse(station, finalRequest, finalVehicle);
                    } catch (Exception e) {
                        log.warn("Error creating response for station {}: {}",
                                station.getId(), e.getMessage());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // Sort based on rank score
        responses.sort((a, b) -> Double.compare(b.getRankScore(), a.getRankScore()));

        // Limit results
        if (responses.size() > request.getLimit()) {
            responses = responses.subList(0, request.getLimit());
        }

        log.info("Returning {} recommendations ({} from API, {} from database)",
                responses.size(),
                stations.stream().filter(s -> "OpenChargeMap".equals(s.getDataSource())).count(),
                stations.stream().filter(s -> !"OpenChargeMap".equals(s.getDataSource())).count());

        return responses;
    }

    /**
     * Apply filter criteria to stations with null safety
     */
    private boolean applyFilters(ChargingStation station,
                                 StationRecommendationRequest request,
                                 Vehicle vehicle) {

        if (station == null) return false;

        // Check operational status
        if (station.getIsOperational() == null || !station.getIsOperational()) {
            return false;
        }

        // Fast charging only filter
        if (request.getFastChargingOnly()) {
            Double power = station.getMaxPowerKw();
            if (power == null || power < 50) {
                return false;
            }
        }

        // Minimum power filter
        if (request.getMinPowerKw() > 0) {
            Double power = station.getMaxPowerKw();
            if (power == null || power < request.getMinPowerKw()) {
                return false;
            }
        }

        // Connector type filter
        if (request.getConnectorType() != null &&
                !request.getConnectorType().equals("ALL") &&
                !request.getConnectorType().isEmpty()) {

            String connectors = station.getConnectorTypes();
            if (connectors == null || connectors.isEmpty()) {
                return false;
            }

            String[] stationConnectors = connectors.split(",");
            boolean hasConnector = Arrays.stream(stationConnectors)
                    .map(String::trim)
                    .anyMatch(c -> c.equalsIgnoreCase(request.getConnectorType()));

            if (!hasConnector) {
                return false;
            }
        }

        // Reliability filter
        if (request.getRequireReliable()) {
            Double reliability = station.getReliabilityScore();
            if (reliability == null || reliability < 80) {
                return false;
            }
        }

        return true;
    }

    /**
     * Create response DTO with calculated scores and null safety
     */
    private StationRecommendationResponse createResponse(
            ChargingStation station,
            StationRecommendationRequest request,
            Vehicle vehicle) {

        double distance = locationService.calculateDistance(
                request.getLatitude(),
                request.getLongitude(),
                station.getLatitude(),
                station.getLongitude()
        );

        double rankScore = rankingService.calculateRankScore(
                station,
                request.getLatitude(),
                request.getLongitude(),
                request.getConnectorType(),
                vehicle,
                true
        );

        String reason = rankingService.generateRecommendationReason(
                station, distance, rankScore, vehicle
        );

        // Check if recommended for battery health
        boolean isRecommendedForBattery = false;
        if (vehicle != null) {
            try {
                HealthScoreResponse health = healthService.getScore(vehicle);
                isRecommendedForBattery = health.getHealthScore() < 70 &&
                        (station.getMaxPowerKw() == null || station.getMaxPowerKw() < 50);
            } catch (Exception e) {
                log.warn("Error checking battery health recommendation: {}", e.getMessage());
            }
        }

        // Estimate charging time
        Integer estimatedMinutes = estimateChargingTime(station, 60.0);

        // Parse connector types safely
        List<String> connectorList = new ArrayList<>();
        if (station.getConnectorTypes() != null && !station.getConnectorTypes().isEmpty()) {
            connectorList = Arrays.stream(station.getConnectorTypes().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }
        if (connectorList.isEmpty()) {
            connectorList.add("CCS");
        }

        return new StationRecommendationResponse(
                station.getId(),
                station.getStationName() != null ? station.getStationName() : "Unknown Station",
                Math.round(distance * 10) / 10.0,
                station.getMaxPowerKw() != null ? station.getMaxPowerKw() : 50.0,
                connectorList,
                station.getNetworkOperator() != null ? station.getNetworkOperator() : "Unknown",
                station.getReliabilityScore() != null ? station.getReliabilityScore() : 70.0,
                station.getPricePerKwh(),
                Math.round(rankScore * 10) / 10.0,
                reason != null ? reason : "Matches your criteria",
                isRecommendedForBattery,
                station.getAddress(),
                station.getAvailableConnectors() != null && station.getAvailableConnectors() > 0,
                estimatedMinutes,
                station.getLatitude(),
                station.getLongitude()
        );
    }

    private Integer estimateChargingTime(ChargingStation station, Double batteryCapacityKwh) {
        if (station.getMaxPowerKw() == null || station.getMaxPowerKw() <= 0) {
            return 60;
        }
        double energyNeeded = batteryCapacityKwh * 0.6;
        double hours = energyNeeded / station.getMaxPowerKw();
        return (int) Math.ceil(hours * 60 * 1.1);
    }

    public StationDetailResponse getStationDetails(Long stationId) {
        ChargingStation station = stationRepository.findById(stationId)
                .orElseThrow(() -> new RuntimeException("Station not found"));

        List<ConnectorDetail> connectors = new ArrayList<>();

        String[] types = new String[]{"CCS"};
        if (station.getConnectorTypes() != null && !station.getConnectorTypes().isEmpty()) {
            types = station.getConnectorTypes().split(",");
        }

        for (String type : types) {
            if (type == null || type.trim().isEmpty()) continue;

            ConnectorDetail detail = new ConnectorDetail(
                    type.trim(),
                    station.getMaxPowerKw() != null ? station.getMaxPowerKw() : 50.0,
                    station.getTotalConnectors() != null ?
                            station.getTotalConnectors() / types.length : 1,
                    station.getAvailableConnectors() != null ?
                            station.getAvailableConnectors() / types.length : 1,
                    "Available"
            );
            connectors.add(detail);
        }

        return new StationDetailResponse(
                station.getId(),
                station.getStationName() != null ? station.getStationName() : "Unknown",
                station.getAddress(),
                station.getCity(),
                station.getState(),
                station.getLatitude(),
                station.getLongitude(),
                connectors,
                station.getNetworkOperator() != null ? station.getNetworkOperator() : "Unknown",
                station.getReliabilityScore() != null ? station.getReliabilityScore() : 70.0,
                station.getPricePerKwh(),
                station.getIsPublic() != null ? station.getIsPublic() : true,
                station.getIsFree() != null ? station.getIsFree() : false,
                station.getIsOperational() != null ? station.getIsOperational() : true,
                station.getPhoneNumber(),
                station.getWebsite(),
                Arrays.asList("Parking", "Restroom", "24/7 Access"),
                station.getLastUpdated() != null ?
                        station.getLastUpdated().toString() : "Recently updated"
        );
    }
}