package com.ev.AI_battery.service;

import com.ev.AI_battery.model.ChargingStation;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class OpenChargeMapService {

    @Value("${openchargemap.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String OCM_API_URL = "https://api.openchargemap.io/v3/poi";

    @PostConstruct
    public void init() {
        log.info("OpenChargeMap Service initialized with key: {}",
                apiKey != null && !apiKey.isEmpty() && !apiKey.startsWith("${") ? "Key present" : "No key configured - using sample data");
    }

    /**
     * Fetch charging stations from OpenChargeMap API based on user's location
     */
    public List<ChargingStation> fetchStationsFromOCM(
            double latitude,
            double longitude,
            double radiusKm) {

        List<ChargingStation> stations = new ArrayList<>();

        // Check if API key is configured
        if (apiKey == null || apiKey.isEmpty() || apiKey.startsWith("${")) {
            log.warn("OpenChargeMap API key not configured. Using sample data for location: {}, {}", latitude, longitude);
            return getLocationBasedSampleStations(latitude, longitude);
        }

        try {
            // Build URL with parameters
            String url = UriComponentsBuilder.fromUriString(OCM_API_URL)
                    .queryParam("key", apiKey)
                    .queryParam("latitude", latitude)
                    .queryParam("longitude", longitude)
                    .queryParam("distance", radiusKm)
                    .queryParam("distanceunit", "km")
                    .queryParam("maxresults", 50)
                    .queryParam("compact", true)
                    .queryParam("verbose", false)
                    .queryParam("opendata", true)
                    .build()
                    .toUriString();

            log.info("Fetching stations from OpenChargeMap API");

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                stations = parseOCMResponse(response.getBody(), latitude, longitude);
                log.info("Fetched {} real stations from OpenChargeMap", stations.size());
            }

        } catch (Exception e) {
            log.error("Error fetching from OpenChargeMap API: {}", e.getMessage());
        }

        // If no stations found, return location-based sample data
        if (stations.isEmpty()) {
            log.warn("No stations found from API, using sample data");
            stations = getLocationBasedSampleStations(latitude, longitude);
        }

        return stations;
    }

    /**
     * Parse OpenChargeMap API response
     */
    private List<ChargingStation> parseOCMResponse(String jsonResponse, double userLat, double userLon) {
        List<ChargingStation> stations = new ArrayList<>();

        try {
            JsonNode root = objectMapper.readTree(jsonResponse);

            if (root.isArray()) {
                for (JsonNode node : root) {
                    try {
                        ChargingStation station = new ChargingStation();

                        // Basic info
                        JsonNode addressInfo = node.path("AddressInfo");
                        station.setStationName(getJsonPath(addressInfo, "Title", "EV Charging Station"));

                        // Location
                        double lat = addressInfo.path("Latitude").asDouble();
                        double lon = addressInfo.path("Longitude").asDouble();

                        // Skip if coordinates are invalid
                        if (lat == 0 || lon == 0) continue;

                        station.setLatitude(lat);
                        station.setLongitude(lon);

                        // Address details
                        station.setAddress(getJsonPath(addressInfo, "AddressLine1", null));
                        station.setCity(getJsonPath(addressInfo, "Town", null));
                        station.setState(getJsonPath(addressInfo, "StateOrProvince", null));
                        station.setZipCode(getJsonPath(addressInfo, "Postcode", null));

                        // Parse connector types from Connections array
                        List<String> connectors = new ArrayList<>();
                        double maxPower = 0;
                        int totalConnectors = 0;

                        JsonNode connections = node.path("Connections");
                        if (connections.isArray()) {
                            for (JsonNode conn : connections) {
                                JsonNode connectionType = conn.path("ConnectionType");
                                String title = connectionType.path("Title").asText();
                                String connectorType = mapConnectorType(title);
                                if (connectorType != null && !connectors.contains(connectorType)) {
                                    connectors.add(connectorType);
                                }

                                // Get power
                                double power = conn.path("PowerKW").asDouble();
                                if (power > maxPower) {
                                    maxPower = power;
                                }

                                // Count connectors
                                totalConnectors++;
                            }
                        }

                        // Default connectors if none found
                        if (connectors.isEmpty()) {
                            connectors.add("CCS");
                            connectors.add("TYPE2");
                        }

                        station.setConnectorTypes(String.join(",", connectors));
                        station.setMaxPowerKw(maxPower > 0 ? maxPower : 50.0);
                        station.setTotalConnectors(totalConnectors > 0 ? totalConnectors : connectors.size() * 2);
                        station.setAvailableConnectors(connectors.size()); // Estimate

                        // Operator info
                        JsonNode operatorInfo = node.path("OperatorInfo");
                        station.setNetworkOperator(getJsonPath(operatorInfo, "Title", "Unknown"));
                        station.setWebsite(getJsonPath(operatorInfo, "WebsiteURL", null));

                        // Additional fields
                        station.setPhoneNumber(getJsonPath(addressInfo, "ContactTelephone1", null));
                        station.setReliabilityScore(85.0); // Default reliability
                        station.setPricePerKwh(0.35); // Default price
                        station.setIsPublic(true);
                        station.setIsFree(false);
                        station.setIsOperational(true);

                        station.setDataSource("OpenChargeMap");
                        station.setLastUpdated(LocalDateTime.now());

                        stations.add(station);

                    } catch (Exception e) {
                        log.warn("Error parsing individual station: {}", e.getMessage());
                    }
                }
            }

        } catch (Exception e) {
            log.error("Error parsing OpenChargeMap response: {}", e.getMessage());
        }

        return stations;
    }

    /**
     * Helper method to safely get JSON path values
     */
    private String getJsonPath(JsonNode node, String path, String defaultValue) {
        JsonNode value = node.path(path);
        if (value == null || value.isMissingNode() || value.isNull()) {
            return defaultValue;
        }
        return value.asText(defaultValue);
    }

    /**
     * Map OpenChargeMap connector types to your standard types
     */
    private String mapConnectorType(String ocmType) {
        if (ocmType == null) return null;

        String upperType = ocmType.toUpperCase();
        if (upperType.contains("J1772") || upperType.contains("TYPE 2") || upperType.contains("TYPE2")) {
            return "TYPE2";
        }
        if (upperType.contains("CHADEMO")) {
            return "CHADEMO";
        }
        if (upperType.contains("CCS")) {
            return "CCS";
        }
        if (upperType.contains("TESLA")) {
            return "TESLA";
        }
        if (upperType.contains("WALL") || upperType.contains("DOMESTIC")) {
            return "TYPE2";
        }
        return null;
    }

    /**
     * Generate location-based sample stations when API fails
     */
    private List<ChargingStation> getLocationBasedSampleStations(double lat, double lon) {
        List<ChargingStation> stations = new ArrayList<>();

        // Create realistic stations around the user's location (Indian cities focused)
        String[][] stationData = {
                {"Tata Power EZ Charge", "0.005", "0.005", "150", "CCS,CHADEMO,TYPE2", "0.35", "95", "Tata Power"},
                {"Ather Grid Point", "0.015", "-0.008", "100", "CCS,TYPE2", "0.30", "88", "Ather"},
                {"Zeon Charging Hub", "-0.010", "0.012", "120", "CCS,CHADEMO", "0.32", "92", "Zeon"},
                {"Magenta Power", "0.020", "-0.015", "22", "TYPE2", "0.25", "90", "Magenta"},
                {"Fortum Charge & Drive", "-0.015", "-0.010", "60", "CCS,CHADEMO,TYPE2", "0.28", "85", "Fortum"},
                {"Delta Electronics", "0.025", "0.008", "50", "CCS,TYPE2", "0.33", "87", "Delta"},
                {"EESL E-Charge", "-0.020", "0.018", "22", "TYPE2", "0.27", "91", "EESL"},
                {"BOLT Charging", "0.012", "-0.020", "120", "CCS,CHADEMO", "0.34", "89", "BOLT"},
                {"Kazam EV", "-0.025", "-0.005", "50", "CCS,TYPE2", "0.29", "86", "Kazam"},
                {"Exicom Telematics", "0.008", "0.025", "150", "CCS,CHADEMO,TYPE2", "0.36", "94", "Exicom"}
        };

        for (int i = 0; i < stationData.length; i++) {
            ChargingStation station = new ChargingStation();
            station.setStationName(stationData[i][0]);
            station.setLatitude(lat + Double.parseDouble(stationData[i][1]));
            station.setLongitude(lon + Double.parseDouble(stationData[i][2]));
            station.setMaxPowerKw(Double.parseDouble(stationData[i][3]));
            station.setConnectorTypes(stationData[i][4]);
            station.setPricePerKwh(Double.parseDouble(stationData[i][5]));
            station.setReliabilityScore(Double.parseDouble(stationData[i][6]));
            station.setNetworkOperator(stationData[i][7]);
            station.setAddress("Sample Address " + (i+1));
            station.setCity("Your City");
            station.setState("State");
            station.setZipCode("5000" + (i+1));
            station.setIsPublic(true);
            station.setIsFree(false);
            station.setIsOperational(true);
            station.setTotalConnectors(4);
            station.setAvailableConnectors(2);
            station.setDataSource("SAMPLE");
            station.setLastUpdated(LocalDateTime.now());

            stations.add(station);
        }

        log.info("Generated {} sample stations around location {}, {}", stations.size(), lat, lon);
        return stations;
    }

    // Add this temporary test method to OpenChargeMapService.java
    public void testApiConnection() {
        try {
            List<ChargingStation> stations = fetchStationsFromOCM(17.3850, 78.4867, 20);
            log.info("API TEST: Found {} stations in Hyderabad", stations.size());
            if (!stations.isEmpty()) {
                log.info("First station: {}", stations.get(0).getStationName());
            }
        } catch (Exception e) {
            log.error("API TEST FAILED: {}", e.getMessage());
        }
    }
}