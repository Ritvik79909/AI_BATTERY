package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.*;
import com.ev.AI_battery.ml.ShapCalculator;
import com.ev.AI_battery.model.BatteryDailySummary;
import com.ev.AI_battery.model.BatteryExplanation;
import com.ev.AI_battery.model.Vehicle;
import com.ev.AI_battery.repository.BatteryDailySummaryRepository;
import com.ev.AI_battery.repository.BatteryExplanationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import com.google.gson.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryExplanationService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final BatteryHealthService healthService;
    private final ChargingHabitService habitService;
    private final BatteryDailySummaryRepository dailyRepo;
    private final BatteryExplanationRepository explanationRepo;
    private final MlModelLoader modelLoader;
    private final ShapCalculator shapCalculator;

    private final RestTemplate restTemplate = new RestTemplate();
    private final Gson gson = new Gson();

    public BatteryExplanationResponse getExplanation(Vehicle vehicle) {
        try {
            log.info("========== GENERATING EXPLANATION FOR VEHICLE {} ==========", vehicle.getId());

            // Get health data
            HealthScoreResponse health = healthService.getScore(vehicle);
            SoHResponse soh = healthService.getSoH(vehicle);
            log.info("Health score: {}, SoH: {}", health.getHealthScore(), soh.getSoh());

            // Get summaries
            BatteryDailySummary latestSummary = getLatestSummary(vehicle);
            ChargingHabitSummary habits = habitService.analyzeHabits(vehicle);
            log.info("Habits - Fast charging: {}%, Frequency: {}/week",
                    habits.getFastChargingPercentage(), habits.getChargingFrequencyPerWeek());

            // Prepare features and get SHAP values
            double[] features = prepareFeatureVector(vehicle, latestSummary, habits);
            Map<String, Double> shapValues = shapCalculator.calculateShapValues(features);

            // Convert to factors
            List<ExplanationFactor> factors = convertShapToFactors(shapValues, latestSummary, habits);
            log.info("Created {} factors", factors.size());

            // Generate 3-line explanation (TRY GEMINI FIRST)
            String explanation = generateThreeLineExplanation(health.getHealthScore(), factors, habits);
            log.info("Generated explanation: {}", explanation);

            // Store in database
            storeExplanation(vehicle, health.getHealthScore(), soh.getSoh(), explanation, factors);

            // Return response
            BatteryExplanationResponse response = new BatteryExplanationResponse(
                    health.getHealthScore(),
                    soh.getSoh(),
                    explanation,
                    factors,
                    LocalDateTime.now(),
                    modelLoader.isModelLoaded() ? "ML_MODEL_WITH_SHAP" : "FALLBACK"
            );

            log.info("========== EXPLANATION COMPLETE ==========");
            return response;

        } catch (Exception e) {
            log.error("Failed to generate explanation", e);
            return fallbackExplanation(vehicle);
        }
    }

    /**
     * Generate 3-line explanation - TRIES GEMINI FIRST, then falls back
     */
    private String generateThreeLineExplanation(Integer healthScore, List<ExplanationFactor> factors,
                                                ChargingHabitSummary habits) {
        // TRY GEMINI FIRST
        String geminiExplanation = tryGeminiForExplanation(healthScore, factors, habits);

        if (geminiExplanation != null && !geminiExplanation.isEmpty()) {
            log.info("Successfully generated Gemini explanation");
            return geminiExplanation;
        }

        log.warn("Gemini failed, using enhanced template explanation");

        // FALLBACK 1: Enhanced template with 3 lines
        return generateEnhancedTemplateExplanation(healthScore, factors, habits);
    }

    /**
     * Try Gemini API with multiple models and better error handling
     */
    private String tryGeminiForExplanation(Integer healthScore, List<ExplanationFactor> factors,
                                           ChargingHabitSummary habits) {
        String[] modelsToTry = {"gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"};

        // Get top factors
        List<ExplanationFactor> topNegative = factors.stream()
                .filter(f -> f.getContribution() < 0)
                .sorted((a, b) -> Double.compare(b.getContribution(), a.getContribution()))
                .limit(2)
                .collect(Collectors.toList());

        List<ExplanationFactor> topPositive = factors.stream()
                .filter(f -> f.getContribution() > 0)
                .sorted((a, b) -> Double.compare(b.getContribution(), a.getContribution()))
                .limit(1)
                .collect(Collectors.toList());

        // Build prompt for 3-line response
        String prompt = String.format(
                "You are an EV battery expert. Generate EXACTLY 3 sentences about battery health.\n\n" +
                        "Battery Health Score: %d/100\n" +
                        "Charging Frequency: %.1f times/week\n" +
                        "Fast Charging: %.1f%%\n\n" +
                        "Negative Factors:\n%s\n" +
                        "Positive Factors:\n%s\n\n" +
                        "Format your response as EXACTLY 3 lines:\n" +
                        "Line 1: State the health score and main issue\n" +
                        "Line 2: Explain the key factors affecting it\n" +
                        "Line 3: Give one actionable recommendation\n" +
                        "Do not add any extra text or numbering.",
                healthScore,
                habits.getChargingFrequencyPerWeek(),
                habits.getFastChargingPercentage(),
                formatFactorsForPrompt(topNegative, true),
                formatFactorsForPrompt(topPositive, false)
        );

        for (String model : modelsToTry) {
            try {
                log.debug("Trying Gemini model: {}", model);
                String response = callGeminiApi(model, prompt);
                if (response != null && !response.isEmpty()) {
                    // Validate it has 3 lines
                    String[] lines = response.split("\n");
                    if (lines.length >= 3) {
                        return response;
                    }
                }
            } catch (Exception e) {
                log.debug("Model {} failed: {}", model, e.getMessage());
            }
        }

        return null;
    }

    private String formatFactorsForPrompt(List<ExplanationFactor> factors, boolean isNegative) {
        if (factors.isEmpty()) return "None";
        return factors.stream()
                .map(f -> String.format("- %s: %.1f points (%s)",
                        f.getFactor(), Math.abs(f.getContribution()), f.getDescription()))
                .collect(Collectors.joining("\n"));
    }

    /**
     * Call Gemini API with proper error handling
     */
    private String callGeminiApi(String model, String prompt) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            JsonObject requestBody = new JsonObject();
            JsonArray contents = new JsonArray();
            JsonObject contentItem = new JsonObject();
            JsonArray partsArray = new JsonArray();

            JsonObject partObject = new JsonObject();
            partObject.addProperty("text", prompt);
            partsArray.add(partObject);

            contentItem.add("parts", partsArray);
            contents.add(contentItem);
            requestBody.add("contents", contents);

            JsonObject generationConfig = new JsonObject();
            generationConfig.addProperty("temperature", 0.4);
            generationConfig.addProperty("maxOutputTokens", 200);
            generationConfig.addProperty("topP", 0.8);
            requestBody.add("generationConfig", generationConfig);

            HttpEntity<String> entity = new HttpEntity<>(gson.toJson(requestBody), headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                JsonObject jsonResponse = gson.fromJson(response.getBody(), JsonObject.class);
                JsonArray candidates = jsonResponse.getAsJsonArray("candidates");

                if (candidates != null && candidates.size() > 0) {
                    JsonObject candidate = candidates.get(0).getAsJsonObject();
                    JsonObject content = candidate.getAsJsonObject("content");
                    JsonArray parts = content.getAsJsonArray("parts");
                    String text = parts.get(0).getAsJsonObject().get("text").getAsString();
                    return text.trim();
                }
            }
        } catch (RestClientException e) {
            log.debug("Gemini API error: {}", e.getMessage());
        } catch (Exception e) {
            log.debug("Unexpected error: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Enhanced template explanation - ALWAYS returns 3 lines
     */
    private String generateEnhancedTemplateExplanation(Integer healthScore, List<ExplanationFactor> factors,
                                                       ChargingHabitSummary habits) {
        StringBuilder explanation = new StringBuilder();

        // Find worst negative factor
        Optional<ExplanationFactor> worstNegative = factors.stream()
                .filter(f -> f.getContribution() < 0)
                .min(Comparator.comparingDouble(ExplanationFactor::getContribution));

        // Find best positive factor
        Optional<ExplanationFactor> bestPositive = factors.stream()
                .filter(f -> f.getContribution() > 0)
                .max(Comparator.comparingDouble(ExplanationFactor::getContribution));

        // LINE 1: Health score and main issue
        if (worstNegative.isPresent()) {
            explanation.append("Your battery health is ").append(healthScore)
                    .append("/100, mainly affected by ").append(worstNegative.get().getFactor().toLowerCase())
                    .append(" (").append(worstNegative.get().getDescription()).append(").\n");
        } else {
            explanation.append("Your battery health is ").append(healthScore)
                    .append("/100, which is in excellent condition.\n");
        }

        // LINE 2: Secondary factors and charging frequency
        List<ExplanationFactor> otherFactors = factors.stream()
                .filter(f -> f.getContribution() < 0)
                .sorted((a, b) -> Double.compare(b.getContribution(), a.getContribution()))
                .skip(1)
                .limit(1)
                .collect(Collectors.toList());

        if (!otherFactors.isEmpty()) {
            explanation.append("Additional stress comes from ").append(otherFactors.get(0).getFactor().toLowerCase())
                    .append(", with ").append(String.format("%.1f", habits.getChargingFrequencyPerWeek()))
                    .append(" charging sessions per week.\n");
        } else if (bestPositive.isPresent()) {
            explanation.append("Your ").append(bestPositive.get().getFactor().toLowerCase())
                    .append(" is helping preserve battery life (+").append(String.format("%.1f", bestPositive.get().getContribution()))
                    .append(" points).\n");
        } else {
            explanation.append("You charge ").append(String.format("%.1f", habits.getChargingFrequencyPerWeek()))
                    .append(" times per week.\n");
        }

        // LINE 3: Recommendation
        if (healthScore < 80) {
            explanation.append("Recommendation: Reduce fast charging and maintain charge between 20-80% to extend battery life.");
        } else if (habits.getFastChargingPercentage() > 30) {
            explanation.append("Recommendation: Limit fast charging to preserve long-term battery health.");
        } else if (worstNegative.isPresent() && worstNegative.get().getFactor().contains("depth")) {
            explanation.append("Recommendation: Avoid deep discharges below 20% to reduce stress on your battery.");
        } else {
            explanation.append("Recommendation: Continue your current charging habits to maintain good battery health.");
        }

        return explanation.toString();
    }

    // ==================== HELPER METHODS (Keep all your existing ones) ====================

    private List<ExplanationFactor> convertShapToFactors(Map<String, Double> shapValues,
                                                         BatteryDailySummary summary,
                                                         ChargingHabitSummary habits) {
        List<ExplanationFactor> factors = new ArrayList<>();

        if (shapValues == null || shapValues.isEmpty()) {
            return createDefaultFactors(summary, habits);
        }

        for (Map.Entry<String, Double> entry : shapValues.entrySet()) {
            String featureKey = entry.getKey();
            double contribution = entry.getValue();

            String displayName = getFeatureDisplayName(featureKey);
            String impact = contribution > 0 ? "Positive" : "Negative";
            String description = getFeatureDescription(featureKey, summary, habits);

            factors.add(new ExplanationFactor(
                    displayName,
                    Math.round(contribution * 10) / 10.0,
                    impact,
                    description
            ));
        }

        factors.sort((a, b) -> Double.compare(Math.abs(b.getContribution()), Math.abs(a.getContribution())));
        return factors;
    }

    private List<ExplanationFactor> createDefaultFactors(BatteryDailySummary summary,
                                                         ChargingHabitSummary habits) {
        List<ExplanationFactor> factors = new ArrayList<>();

        int cycles = summary.getDailyCycleIncrement() != null ? summary.getDailyCycleIncrement() * 30 : 120;
        double temp = summary.getMaxTemperature() != null ? summary.getMaxTemperature() : 26.5;
        double fastPct = habits != null && habits.getFastChargingPercentage() != null ?
                habits.getFastChargingPercentage() : 25.0;
        double depth = habits != null && habits.getAverageChargeDepth() != null ?
                habits.getAverageChargeDepth() : 65.0;

        factors.add(new ExplanationFactor("Charging cycles", -3.0, "Negative", cycles + " cycles"));
        factors.add(new ExplanationFactor("Temperature", -1.8, "Negative", String.format("%.1f°C", temp)));
        factors.add(new ExplanationFactor("Fast charging", -2.2, "Negative", String.format("%.0f%% fast charging", fastPct)));
        factors.add(new ExplanationFactor("Charge depth", -1.2, "Negative", String.format("%.0f%% depth", depth)));

        return factors;
    }

    private String getFeatureDisplayName(String featureKey) {
        Map<String, String> displayNames = new HashMap<>();
        displayNames.put("cycle_count", "Charging cycles");
        displayNames.put("avg_temperature", "Average temperature");
        displayNames.put("max_temperature", "Peak temperature");
        displayNames.put("fast_charging_pct", "Fast charging usage");
        displayNames.put("avg_voltage", "Voltage stability");
        displayNames.put("charge_depth_avg", "Charge depth");
        return displayNames.getOrDefault(featureKey, featureKey);
    }

    private String getFeatureDescription(String featureKey, BatteryDailySummary summary,
                                         ChargingHabitSummary habits) {
        switch (featureKey) {
            case "cycle_count":
                int cycles = summary.getDailyCycleIncrement() != null ? summary.getDailyCycleIncrement() * 30 : 120;
                return cycles + " cycles";
            case "avg_temperature":
            case "max_temperature":
                double temp = summary.getMaxTemperature() != null ? summary.getMaxTemperature() : 26.5;
                return String.format("%.1f°C", temp);
            case "fast_charging_pct":
                double fastPct = habits != null && habits.getFastChargingPercentage() != null ?
                        habits.getFastChargingPercentage() : 25.0;
                return String.format("%.0f%% fast charging", fastPct);
            case "avg_voltage":
                double voltage = summary.getAvgVoltage() != null ? summary.getAvgVoltage() : 3.7;
                return String.format("%.2fV", voltage);
            case "charge_depth_avg":
                double depth = habits != null && habits.getAverageChargeDepth() != null ?
                        habits.getAverageChargeDepth() : 65.0;
                return String.format("%.0f%% depth", depth);
            default:
                return "Normal";
        }
    }

    private double[] prepareFeatureVector(Vehicle vehicle, BatteryDailySummary summary,
                                          ChargingHabitSummary habits) {
        double[] features = new double[6];
        features[0] = summary.getDailyCycleIncrement() != null ? summary.getDailyCycleIncrement() * 30 : 120.0;
        features[1] = summary.getMaxTemperature() != null ? summary.getMaxTemperature() : 26.5;
        features[2] = features[1] + 3.0;
        features[3] = habits != null && habits.getFastChargingPercentage() != null ? habits.getFastChargingPercentage() : 25.0;
        features[4] = summary.getAvgVoltage() != null ? summary.getAvgVoltage() : 3.7;
        features[5] = habits != null && habits.getAverageChargeDepth() != null ? habits.getAverageChargeDepth() : 65.0;
        return features;
    }

    private void storeExplanation(Vehicle vehicle, Integer healthScore, Double soh,
                                  String explanation, List<ExplanationFactor> factors) {
        try {
            BatteryExplanation entity = new BatteryExplanation();
            entity.setVehicle(vehicle);
            entity.setHealthScore(healthScore);
            entity.setSoh(soh);
            entity.setExplanation(explanation);
            entity.setFactors(gson.toJson(factors));
            entity.setTimestamp(LocalDateTime.now());
            explanationRepo.save(entity);
            log.info("Stored explanation for vehicle {}", vehicle.getId());
        } catch (Exception e) {
            log.warn("Failed to store explanation", e);
        }
    }

    private BatteryDailySummary getLatestSummary(Vehicle vehicle) {
        List<BatteryDailySummary> summaries = dailyRepo.findByVehicleOrderByDateDesc(vehicle);
        if (summaries.isEmpty()) {
            BatteryDailySummary mock = new BatteryDailySummary();
            mock.setMaxTemperature(26.5);
            mock.setDailyCycleIncrement(4);
            mock.setAvgVoltage(3.72);
            mock.setAvgSoc(75.0);
            return mock;
        }
        return summaries.get(0);
    }

    private BatteryExplanationResponse fallbackExplanation(Vehicle vehicle) {
        List<ExplanationFactor> factors = Arrays.asList(
                new ExplanationFactor("Charging cycles", -2.8, "Negative", "120 cycles"),
                new ExplanationFactor("Fast charging", -2.2, "Negative", "25% fast charging"),
                new ExplanationFactor("Temperature", -1.5, "Negative", "26.5°C")
        );

        return new BatteryExplanationResponse(
                85,
                92.5,
                "Your battery health is 85/100, affected by charging cycles and fast charging. You charge 4.5 times per week. Consider reducing fast charging to extend battery life.",
                factors,
                LocalDateTime.now(),
                "FALLBACK"
        );
    }
}