package com.ev.AI_battery.service;

import com.ev.AI_battery.dto.*;
import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.AiCoachingHistoryRepository;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiCoachingService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final BatteryHealthService healthService;
    private final ChargingHabitService habitService;
    private final ChargingOptimizationService optService;
    private final AiCoachingHistoryRepository historyRepo;

    private final RestTemplate restTemplate = new RestTemplate();
    private final Gson gson = new Gson();

    public AiCoachingResponse askQuestion(Vehicle vehicle, String question) {
        try {
            // ✅ SAFE DATA FETCH with fallbacks
            HealthScoreResponse health = safeGetHealthScore(vehicle);
            ChargingHabitSummary habits = safeGetHabits(vehicle);
            ChargingOptimizationRecommendation opt = safeGetOptimization(vehicle);

            // Get detailed battery data
            Double soh = safeGetSoH(vehicle);
            Integer rulCycles = safeGetRUL(vehicle);

            // Log the actual data being used
            log.info("Vehicle {} - Health Score: {}, SoH: {}, RUL: {}, Fast Charging: {}, Habit Score: {}",
                    vehicle.getId(),
                    health.getHealthScore(),
                    soh,
                    rulCycles,
                    habits.getFastChargingPercentage(),
                    habits.getHabitScore());

            // Classify issue based on actual data
            CoachingContext context = classifyIssue(vehicle, health, habits, opt, soh, rulCycles);

            // Build prompt with explicit instructions to use the data
            String prompt = buildEnhancedGeminiPrompt(context, question, vehicle);

            // Call Gemini
            AiCoachingResponse response = callGeminiApi(prompt);

            // Enhance response with actual data if Gemini fails
            if (response.getAnswer().contains("technical difficulties") ||
                    response.getRecommendations().get(0).equals("Follow recommendations")) {
                response = buildDataDrivenFallback(context, question);
            }

            // Store history
            storeCoachingHistory(vehicle, question, response);

            return response;

        } catch (Exception e) {
            log.error("AI Coaching failed for vehicle {}", vehicle.getId(), e);
            return buildDataDrivenFallback(null, question);
        }
    }

    private Double safeGetSoH(Vehicle vehicle) {
        try {
            return healthService.getSoH(vehicle).getSoh();
        } catch (Exception e) {
            log.warn("SoH fetch failed, using fallback");
            return 90.0;
        }
    }

    private Integer safeGetRUL(Vehicle vehicle) {
        try {
            return healthService.getRUL(vehicle).getRulCycles();
        } catch (Exception e) {
            log.warn("RUL fetch failed, using fallback");
            return 800;
        }
    }

    private HealthScoreResponse safeGetHealthScore(Vehicle vehicle) {
        try {
            return healthService.calculateScore(vehicle);
        } catch (Exception e) {
            log.warn("Health score fetch failed, using fallback");
            return new HealthScoreResponse(85, "Good");
        }
    }

    private ChargingHabitSummary safeGetHabits(Vehicle vehicle) {
        try {
            return habitService.analyzeHabits(vehicle);
        } catch (Exception e) {
            log.warn("Habit analysis failed, using fallback");
            return new ChargingHabitSummary(5.0, 20.0, 70.0, 85.0, "Healthy",
                    Arrays.asList("No habit data"), "Good habits");
        }
    }

    private ChargingOptimizationRecommendation safeGetOptimization(Vehicle vehicle) {
        try {
            return optService.getRecommendations(vehicle);
        } catch (Exception e) {
            log.warn("Optimization failed, using fallback");
            return new ChargingOptimizationRecommendation(80, "Night hours",
                    "Healthy", "Optimal", "MEDIUM", Arrays.asList("Fallback"), 10.0);
        }
    }

    private CoachingContext classifyIssue(Vehicle vehicle, HealthScoreResponse health,
                                          ChargingHabitSummary habits,
                                          ChargingOptimizationRecommendation opt,
                                          Double soh, Integer rulCycles) {
        CoachingContext ctx = new CoachingContext();

        // Safe data extraction
        double score = health.getHealthScore() != null ? health.getHealthScore() : 85.0;
        double fastPct = habits.getFastChargingPercentage() != null ? habits.getFastChargingPercentage() : 20.0;
        double habitScore = habits.getHabitScore() != null ? habits.getHabitScore() : 85.0;

        // More detailed issue classification
        if (score < 60) {
            ctx.setIssueType("Critical Battery Degradation");
            ctx.setSeverity("HIGH");
        } else if (score < 75) {
            ctx.setIssueType("Battery Degradation Warning");
            ctx.setSeverity("MEDIUM");
        } else if (fastPct > 50) {
            ctx.setIssueType("Excessive Fast Charging");
            ctx.setSeverity("HIGH");
        } else if (fastPct > 30) {
            ctx.setIssueType("Fast Charging Stress");
            ctx.setSeverity("MEDIUM");
        } else if (habitScore < 60) {
            ctx.setIssueType("Poor Charging Habits");
            ctx.setSeverity("HIGH");
        } else if (habitScore < 75) {
            ctx.setIssueType("Suboptimal Charging Habits");
            ctx.setSeverity("MEDIUM");
        } else {
            ctx.setIssueType("General Battery Health");
            ctx.setSeverity("LOW");
        }

        // Populate all data
        ctx.setHealthScore(score);
        ctx.setSoh(soh);
        ctx.setRulCycles(rulCycles);
        ctx.setFastChargingPct(fastPct);
        ctx.setHabitScore(habitScore);

        // Get specific recommendations based on the data
        List<String> recommendations = generateDataDrivenRecommendations(ctx);
        ctx.setRecommendations(recommendations);

        return ctx;
    }

    private List<String> generateDataDrivenRecommendations(CoachingContext ctx) {
        List<String> recommendations;

        if (ctx.getHealthScore() < 75) {
            recommendations = Arrays.asList(
                    "Schedule a battery health check with your service center",
                    "Avoid deep discharges below 20%",
                    "Reduce fast charging sessions to preserve battery life"
            );
        } else if (ctx.getFastChargingPct() > 30) {
            recommendations = Arrays.asList(
                    "Limit fast charging to 1-2 times per week",
                    "Use level 2 charging for daily needs",
                    "Keep battery between 20-80% for optimal health"
            );
        } else if (ctx.getHabitScore() < 70) {
            recommendations = Arrays.asList(
                    "Avoid charging to 100% regularly - aim for 80-90%",
                    "Don't let battery drain below 20%",
                    "Maintain regular charging schedule"
            );
        } else {
            recommendations = Arrays.asList(
                    "Continue your good charging habits",
                    "Monitor battery temperature during charging",
                    "Keep software updated for optimal battery management"
            );
        }

        return recommendations;
    }

    private String buildEnhancedGeminiPrompt(CoachingContext ctx, String question, Vehicle vehicle) {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        return String.format(
                "You are EV Battery Coach - an expert automotive battery analyst. You MUST use the provided vehicle data to answer the user's question.\n\n" +
                        "VEHICLE DATA (YOU MUST REFERENCE THIS IN YOUR ANSWER):\n" +
                        "Vehicle ID: %d\n" +
                        "Battery Health Score: %.1f/100\n" +
                        "State of Health (SoH): %.1f%%\n" +
                        "Remaining Useful Life: %d charging cycles\n" +
                        "Fast Charging Usage: %.1f%% of all charges\n" +
                        "Charging Habit Score: %.1f/100\n" +
                        "Analysis Time: %s\n\n" +
                        "IDENTIFIED ISSUE: %s (Severity: %s)\n\n" +
                        "USER QUESTION: \"%s\"\n\n" +
                        "RESPONSE FORMAT - FOLLOW EXACTLY:\n" +
                        "1. Start with a brief, friendly greeting\n" +
                        "2. Direct answer (2-3 sentences) that SPECIFICALLY references the vehicle data above\n" +
                        "3. 3 bullet-point action items based on the data\n" +
                        "4. End with an encouraging note\n\n" +
                        "EXAMPLE GOOD RESPONSE:\n" +
                        "\"Hey there! Looking at your data, I can see your battery health is at 91/100 which is good, but your fast charging usage at 50%% is higher than recommended. Here's what I suggest...\"\n\n" +
                        "Tone: Helpful, friendly, and data-driven. Always reference specific numbers from the vehicle data.",
                vehicle.getId(),
                safeDouble(ctx.getHealthScore(), 85.0),
                safeDouble(ctx.getSoh(), 90.0),
                safeInt(ctx.getRulCycles(), 800),
                safeDouble(ctx.getFastChargingPct(), 20.0),
                safeDouble(ctx.getHabitScore(), 85.0),
                now.format(formatter),
                ctx.getIssueType() != null ? ctx.getIssueType() : "General Battery Health",
                ctx.getSeverity() != null ? ctx.getSeverity() : "LOW",
                question != null ? question : "How's my battery health?"
        );
    }

    private double safeDouble(Double value, double defaultValue) {
        return value != null ? value : defaultValue;
    }

    private int safeInt(Integer value, int defaultValue) {
        return value != null ? value : defaultValue;
    }

    private AiCoachingResponse callGeminiApi(String prompt) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

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
            generationConfig.addProperty("temperature", 0.4); // Lower temperature for more consistent responses
            generationConfig.addProperty("maxOutputTokens", 300);
            generationConfig.addProperty("topP", 0.8);
            requestBody.add("generationConfig", generationConfig);

            HttpEntity<String> entity = new HttpEntity<>(gson.toJson(requestBody), headers);

            log.debug("Calling Gemini API");
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() != HttpStatus.OK) {
                log.warn("Gemini API returned: {}", response.getStatusCode());
                return null;
            }

            JsonObject jsonResponse = gson.fromJson(response.getBody(), JsonObject.class);
            JsonArray candidates = jsonResponse.getAsJsonArray("candidates");

            if (candidates == null || candidates.size() == 0) {
                log.warn("No candidates in Gemini response");
                return null;
            }

            JsonObject candidate = candidates.get(0).getAsJsonObject();
            JsonObject contentObj = candidate.getAsJsonObject("content");
            JsonArray responseParts = contentObj.getAsJsonArray("parts");

            String answer = responseParts.get(0).getAsJsonObject().get("text").getAsString();

            // Parse the issue type from the response or use context
            String issueType = extractIssueType(answer);
            List<String> recommendations = extractRecommendations(answer);

            return new AiCoachingResponse(
                    answer != null ? answer.trim() : "No response received",
                    issueType,
                    "Informational",
                    recommendations.isEmpty() ? Arrays.asList("Follow recommendations", "Monitor progress") : recommendations,
                    LocalDateTime.now()
            );

        } catch (Exception e) {
            log.error("Gemini API call failed", e);
            return null;
        }
    }

    private String extractIssueType(String answer) {
        if (answer == null) return "Battery Health";

        answer = answer.toLowerCase();
        if (answer.contains("degrad")) return "Battery Degradation";
        if (answer.contains("fast charging")) return "Fast Charging";
        if (answer.contains("habit")) return "Charging Habits";
        return "Battery Health";
    }

    private List<String> extractRecommendations(String answer) {
        if (answer == null) return Arrays.asList();

        // Simple extraction - look for bullet points
        String[] lines = answer.split("\n");
        return Arrays.stream(lines)
                .filter(line -> line.trim().startsWith("-") || line.trim().startsWith("•") || line.trim().startsWith("*"))
                .map(line -> line.replaceAll("^[-•*\\s]+", "").trim())
                .filter(rec -> !rec.isEmpty())
                .limit(3)
                .toList();
    }

    private AiCoachingResponse buildDataDrivenFallback(CoachingContext ctx, String question) {
        if (ctx == null) {
            return new AiCoachingResponse(
                    "I'm analyzing your battery data. Based on the information available, I recommend maintaining regular charging habits between 20-80% and avoiding frequent fast charging.",
                    "Battery Health",
                    "Informational",
                    Arrays.asList("Keep battery between 20-80%", "Avoid frequent fast charging", "Monitor battery temperature"),
                    LocalDateTime.now()
            );
        }

        String answer = String.format(
                "Based on your vehicle data, your battery health score is %.1f/100 with %.1f%% State of Health. " +
                        "Your fast charging usage is at %.1f%%. " +
                        "To improve battery longevity, I recommend the following:",
                safeDouble(ctx.getHealthScore(), 85.0),
                safeDouble(ctx.getSoh(), 90.0),
                safeDouble(ctx.getFastChargingPct(), 20.0)
        );

        return new AiCoachingResponse(
                answer,
                ctx.getIssueType(),
                ctx.getSeverity(),
                ctx.getRecommendations(),
                LocalDateTime.now()
        );
    }

    private void storeCoachingHistory(Vehicle vehicle, String question, AiCoachingResponse response) {
        try {
            AiCoachingHistory history = new AiCoachingHistory();
            history.setVehicle(vehicle);
            history.setQuestion(question);
            history.setAnswer(response.getAnswer());
            history.setIssueType(response.getIssueType());
            history.setTimestamp(LocalDateTime.now());
            historyRepo.save(history);
            log.info("Stored coaching history for vehicle {}", vehicle.getId());
        } catch (Exception e) {
            log.warn("Failed to store coaching history", e);
        }
    }

    private AiCoachingResponse fallbackResponse() {
        return new AiCoachingResponse(
                "I'm experiencing technical difficulties. Please check your battery data and try again later.",
                "System",
                "Error",
                Arrays.asList("Upload more telemetry data", "Try again in a few minutes"),
                LocalDateTime.now()
        );
    }
}