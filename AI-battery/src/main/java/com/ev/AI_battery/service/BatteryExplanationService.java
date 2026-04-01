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
    private final SHAPExplainerService shapExplainerService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final Gson gson = new Gson();

    /**
     * Generate explanation for vehicle battery health using SHAP + Gemini
     * 
     * Flow:
     * 1. Get XGBoost predictions (SoH)
     * 2. Calculate SHAP contributions
     * 3. Use gemini_prompt_model.pkl to generate Gemini prompt
     * 4. Send prompt to Gemini API
     * 5. Return Gemini's explanation to frontend
     */
    public BatteryExplanationResponse getExplanation(Vehicle vehicle) {
        try {
            log.info("========== GENERATING EXPLANATION FOR VEHICLE {} ==========", vehicle.getId());

            // Step 1: Get health data and predictions
            HealthScoreResponse health = healthService.getScore(vehicle);
            SoHResponse soh = healthService.getSoH(vehicle);
            log.info("Health score: {}, SoH: {}", health.getHealthScore(), soh.getSoh());

            // Step 2: Get battery summary
            BatteryDailySummary latestSummary = getLatestSummary(vehicle);
            ChargingHabitSummary habits = habitService.analyzeHabits(vehicle);
            log.info("Habits - Fast charging: {}%, Frequency: {}/week",
                    habits.getFastChargingPercentage(), habits.getChargingFrequencyPerWeek());

            // Step 3: Calculate SHAP values for the prediction
            double[] features = prepareFeatureVector(vehicle, latestSummary, habits);
            Map<String, Double> shapValues = shapCalculator.calculateShapValues(features);
            List<ExplanationFactor> factors = convertShapToFactors(shapValues, latestSummary, habits);
            log.info("Created {} SHAP factors", factors.size());

            // Step 4: Generate prompt using gemini_prompt_model.pkl (SHAP explainer)
            String shapGeneratedPrompt = generateSHAPPrompt(soh.getSoh(), factors);
            log.debug("Generated SHAP prompt for Gemini: {}", shapGeneratedPrompt.substring(0, Math.min(100, shapGeneratedPrompt.length())));

            // Step 5: Send to Gemini API with SHAP-generated prompt
            String explanation = sendToGeminiAPI(shapGeneratedPrompt);
            explanation = normalizeExplanationOutput(explanation, soh.getSoh());
            log.info("Generated explanation from Gemini: {}", explanation.substring(0, Math.min(100, explanation.length())));

            // Step 6: Store in database
            storeExplanation(vehicle, health.getHealthScore(), soh.getSoh(), explanation, factors);

            // Step 7: Return response
            BatteryExplanationResponse response = new BatteryExplanationResponse(
                    health.getHealthScore(),
                    soh.getSoh(),
                    explanation,
                    factors,
                    LocalDateTime.now(),
                    "SHAP_GEMINI_PROMPT_MODEL"
            );

            log.info("========== EXPLANATION COMPLETE ==========");
            return response;

        } catch (Exception e) {
            log.error("Failed to generate explanation", e);
            return fallbackExplanation(vehicle);
        }
    }

    /**
     * Step 4: Generate SHAP-based prompt using gemini_prompt_model.pkl
     * 
     * This model takes SHAP contributions and outputs a prompt string
     * to send to Gemini API
     */
    private String generateSHAPPrompt(Double predictedSoh, List<ExplanationFactor> factors) {
        try {
            // SoH baseline is always 100% for healthy batteries
            double baseValue = 100.0;

            // Get top 5 contributors by absolute impact
            List<SHAPExplainerService.FeatureContribution> topContributors = factors.stream()
                    .sorted((a, b) -> Double.compare(
                            Math.abs(b.getContribution()),
                            Math.abs(a.getContribution())
                    ))
                    .limit(5)
                    .map(factor -> new SHAPExplainerService.FeatureContribution(
                            factor.getFactor(),
                            Optional.ofNullable(factor.getFeatureValue()).orElse(0.0),
                            factor.getContribution()
                    ))
                    .toList();

            // Call gemini_prompt_model.pkl to generate prompt
            String prompt = shapExplainerService.generatePrompt(
                    predictedSoh,
                    baseValue,
                    topContributors
            );

            log.debug("SHAP model generated prompt (length: {})", prompt.length());
            return prompt;

        } catch (Exception e) {
            log.error("Error generating SHAP prompt, using fallback", e);
            return generateFallbackSHAPPrompt(predictedSoh, factors);
        }
    }

    /**
     * Fallback prompt when SHAP model is unavailable
     */
    private String generateFallbackSHAPPrompt(Double predictedSoh, List<ExplanationFactor> factors) {
        StringBuilder prompt = new StringBuilder();
        
        double baselineSoH = 100.0;
        double deviation = predictedSoh - baselineSoH;
        String status = deviation > 5 ? "EXCELLENT" : 
                       deviation > 0 ? "GOOD" : 
                       deviation > -5 ? "MODERATE" : 
                       deviation > -10 ? "FAIR" : "CRITICAL";

        prompt.append("Generate a specific EV battery health explanation. Do not use role-play language.\n\n");
        prompt.append("BATTERY HEALTH ANALYSIS REPORT\n");
        prompt.append("Predicted State of Health (SoH): ").append(String.format("%.2f%%", predictedSoh)).append("\n");
        prompt.append("Baseline Expected SoH: ").append(String.format("%.2f%%", baselineSoH)).append("\n");
        prompt.append("Deviation from Baseline: ").append(String.format("%+.2f", deviation)).append(" percentage points\n");
        prompt.append("Overall Status: ").append(status).append("\n\n");

        // Top factors
        List<ExplanationFactor> topFactors = factors.stream()
                .sorted((a, b) -> Double.compare(Math.abs(b.getContribution()), Math.abs(a.getContribution())))
                .limit(5)
                .toList();

        if (!topFactors.isEmpty()) {
            prompt.append("Key Contributing Factors:\n");
            for (int i = 0; i < topFactors.size(); i++) {
                ExplanationFactor factor = topFactors.get(i);
                String impact = factor.getContribution() < 0 ? "negative" : "positive";
                prompt.append(String.format("\n%d. %s\n", i + 1, factor.getFactor()));
                prompt.append(String.format("   Value: %.2f | SHAP Impact: %.4f (%s)\n",
                        Optional.ofNullable(factor.getFeatureValue()).orElse(0.0),
                        factor.getContribution(),
                        impact));
            }
        }

        prompt.append("\n\nProvide exactly these sections:\n");
        prompt.append("1. SoH Interpretation: What ").append(String.format("%.2f%%", predictedSoh)).append("% SoH means for usable capacity and range.\n");
        prompt.append("2. Why SoH Is At This Level: Top 3 causes using the factors above.\n");
        prompt.append("3. Maintenance Plan: Immediate actions (7 days), short-term (30 days), long-term habits.\n");
        prompt.append("4. Improvement Outlook: Expected 3-6 month trend if plan is followed.\n");
        prompt.append("5. Weekly Monitoring: Key metrics to track.\n\n");
        prompt.append("Use plain text only. No markdown symbols like # or *. End with a complete sentence.");

        return prompt.toString();
    }

    /**
     * Step 5: Send SHAP-generated prompt to Gemini API
     */
    private String sendToGeminiAPI(String prompt) {
        String[] modelsToTry = {"gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"};

        for (String model : modelsToTry) {
            try {
                log.debug("Trying Gemini model: {}", model);
                String response = callGeminiApi(model, prompt);
                if (response != null && !response.isEmpty()) {
                    log.info("Successfully got explanation from Gemini model: {}", model);
                    return response;
                }
            } catch (Exception e) {
                log.debug("Model {} failed: {}", model, e.getMessage());
            }
        }

        log.warn("All Gemini models failed, using fallback");
        return "Your battery is experiencing normal degradation. Optimize charging habits and maintain moderate temperatures to extend lifespan.";
    }

    /**
     * Keep frontend output clean plain text and avoid abruptly cut endings.
     */
    private String normalizeExplanationOutput(String explanation, Double soh) {
        if (explanation == null || explanation.isBlank()) {
            return String.format("Battery SoH is %.2f%%. Continue with balanced charging, thermal control, and weekly monitoring to maintain battery health.",
                    Optional.ofNullable(soh).orElse(0.0));
        }

        String cleaned = explanation
                .replace("#", "")
                .replace("*", "")
                .replace("•", "-")
                .replaceAll("[ \t]+", " ")
                .replaceAll("\n{3,}", "\n\n")
                .trim();

        if (cleaned.endsWith(".") || cleaned.endsWith("!") || cleaned.endsWith("?")) {
            return cleaned;
        }

        int lastSentenceEnd = Math.max(cleaned.lastIndexOf('.'), Math.max(cleaned.lastIndexOf('!'), cleaned.lastIndexOf('?')));
        if (lastSentenceEnd > 0) {
            String completePart = cleaned.substring(0, lastSentenceEnd + 1).trim();
            if (!completePart.isBlank()) {
                return completePart;
            }
        }

        return cleaned + String.format(" Final note: battery SoH is %.2f%%, so following the maintenance plan should help slow further degradation.",
                Optional.ofNullable(soh).orElse(0.0));
    }

    /**
     * Call Gemini API
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
            generationConfig.addProperty("temperature", 0.7);
            generationConfig.addProperty("maxOutputTokens", 2048);
            generationConfig.addProperty("topP", 0.95);
            requestBody.add("generationConfig", generationConfig);

            HttpEntity<String> entity = new HttpEntity<>(gson.toJson(requestBody), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                JsonObject jsonResponse = gson.fromJson(response.getBody(), JsonObject.class);
                JsonArray candidates = jsonResponse.getAsJsonArray("candidates");

                if (candidates != null && !candidates.isEmpty()) {
                    JsonObject candidate = candidates.get(0).getAsJsonObject();
                    JsonObject content = candidate.getAsJsonObject("content");
                    JsonArray parts = content.getAsJsonArray("parts");
                    return parts.get(0).getAsJsonObject().get("text").getAsString().trim();
                }
            }
        } catch (RestClientException e) {
            log.debug("Gemini API error: {}", e.getMessage());
        } catch (Exception e) {
            log.debug("Error calling Gemini: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Convert SHAP values to explanation factors
     */
    private List<ExplanationFactor> convertShapToFactors(Map<String, Double> shapValues,
                                                         BatteryDailySummary summary,
                                                         ChargingHabitSummary habits) {
        List<ExplanationFactor> factors = new ArrayList<>();

        for (Map.Entry<String, Double> entry : shapValues.entrySet()) {
            double featureValue = getFeatureValue(entry.getKey(), summary, habits);
            String featureName = getFeatureDisplayName(entry.getKey());
            Double contribution = entry.getValue();
            String description = getFeatureDescription(entry.getKey(), summary, habits);
            String impact = contribution < 0 ? "Negative" : "Positive";

            factors.add(new ExplanationFactor(featureName, featureValue, contribution, impact, description));
        }

        return factors;
    }

    private String getFeatureDisplayName(String featureKey) {
        return featureKey.replace("_", " ").toUpperCase().charAt(0) + featureKey.replace("_", " ").substring(1).toLowerCase();
    }

    private String getFeatureDescription(String featureKey, BatteryDailySummary summary, ChargingHabitSummary habits) {
        switch (featureKey) {
            case "cycle_count":
                return "Charging cycles accumulated";
            case "avg_temperature":
                return "Average operating temperature";
            case "max_temperature":
                return "Peak operating temperature";
            case "fast_charging_pct":
                return "Frequency of fast charging";
            case "avg_voltage":
                return "Average discharge voltage";
            case "charge_depth_avg":
                return "Depth of discharge cycles";
            default:
                return "Battery performance factor";
        }
    }

    private double getFeatureValue(String featureKey, BatteryDailySummary summary, ChargingHabitSummary habits) {
        switch (featureKey) {
            case "cycle_count":
                return summary.getDailyCycleIncrement() != null ? summary.getDailyCycleIncrement() : 100.0;
            case "avg_temperature":
                return summary.getMaxTemperature() != null ? summary.getMaxTemperature() : 25.0;
            case "max_temperature":
                return summary.getMaxTemperature() != null ? summary.getMaxTemperature() + 5.0 : 30.0;
            case "fast_charging_pct":
                return habits != null && habits.getFastChargingPercentage() != null ? habits.getFastChargingPercentage() : 20.0;
            case "avg_voltage":
                return summary.getAvgVoltage() != null ? summary.getAvgVoltage() : 3.7;
            case "charge_depth_avg":
                return habits != null && habits.getAverageChargeDepth() != null ? habits.getAverageChargeDepth() : 60.0;
            default:
                return 0.0;
        }
    }

    private double[] prepareFeatureVector(Vehicle vehicle, BatteryDailySummary summary, ChargingHabitSummary habits) {
        double cycleCount = summary.getDailyCycleIncrement() != null ? summary.getDailyCycleIncrement() : 100;
        double avgTemp = summary.getMaxTemperature() != null ? summary.getMaxTemperature() : 25.0;
        double maxTemp = avgTemp + 5;
        double fastChargingPct = habits != null && habits.getFastChargingPercentage() != null ? habits.getFastChargingPercentage() : 20.0;
        double avgVoltage = summary.getAvgVoltage() != null ? summary.getAvgVoltage() : 3.7;
        double chargeDepth = habits != null && habits.getAverageChargeDepth() != null ? habits.getAverageChargeDepth() : 60.0;

        return new double[]{cycleCount, avgTemp, maxTemp, fastChargingPct, avgVoltage, chargeDepth};
    }

    private void storeExplanation(Vehicle vehicle, Integer healthScore, Double soh, String explanation, List<ExplanationFactor> factors) {
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
            mock.setMaxTemperature(25.0);
            mock.setDailyCycleIncrement(1);
            mock.setAvgVoltage(3.7);
            mock.setAvgSoc(75.0);
            return mock;
        }
        return summaries.get(0);
    }

    private BatteryExplanationResponse fallbackExplanation(Vehicle vehicle) {
        return new BatteryExplanationResponse(
                80,
                85.0,
                "Battery health is within normal parameters. Regular monitoring is recommended.",
                new ArrayList<>(),
                LocalDateTime.now(),
                "FALLBACK"
        );
    }
}

