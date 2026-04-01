package com.ev.AI_battery.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.*;

/**
 * Service to interact with SHAP explanation model (gemini_prompt_model.pkl)
 * Generates prompts based on SHAP feature contributions for Gemini API
 */
@Service
@Slf4j
public class SHAPExplainerService {

    @Value("${shap.model.path:src/main/resources/ml/gemini_prompt_model.pkl}")
    private String modelPath;

    @Value("${python.executable:python}")
    private String pythonExecutable;

    private final Gson gson = new Gson();

    /**
     * Data structure for SHAP explanation input
     */
    public static class SHAPInput {
        public double predicted_soh;
        public double base_value;
        public List<FeatureContribution> top_contributors;

        public SHAPInput(double predictedSoh, double baseValue, List<FeatureContribution> contributors) {
            this.predicted_soh = predictedSoh;
            this.base_value = baseValue;
            this.top_contributors = contributors;
        }
    }

    /**
     * Feature contribution data
     */
    public static class FeatureContribution {
        public String feature_name;
        public double feature_value;
        public double shap_impact;

        public FeatureContribution(String name, double value, double impact) {
            this.feature_name = name;
            this.feature_value = value;
            this.shap_impact = impact;
        }
    }

    /**
     * Generate prompt for Gemini API based on SHAP values
     *
     * @param predictedSoh The SoH prediction from XGBoost model
     * @param baseValue Expected value from SHAP explainer
     * @param contributors List of feature contributions
     * @return Prompt string to send to Gemini API
     */
    public String generatePrompt(double predictedSoh, double baseValue, List<FeatureContribution> contributors) {
        try {
            // Create input data in the expected format
            SHAPInput input = new SHAPInput(predictedSoh, baseValue, contributors);

            // Convert to JSON string
            String inputJson = gson.toJson(input);
            log.debug("SHAP Input: {}", inputJson);

            // Get path to Python explainer script
            String scriptPath = getScriptPath();

            // Build command to execute Python script - pass JSON as piped stdin to avoid escaping issues
            List<String> command = new ArrayList<>();
            command.add(pythonExecutable);
            command.add(scriptPath);
            command.add(modelPath);

            // Execute with JSON passed via stdin
            String result = executeCommandWithInput(command, inputJson);
            log.debug("SHAP Explainer output: {}", result);

            // Parse JSON response containing the prompt
            JsonObject jsonResponse = gson.fromJson(result, JsonObject.class);

            if ("success".equals(jsonResponse.get("status").getAsString())) {
                String prompt = jsonResponse.get("prompt").getAsString();
                log.info("Generated prompt from SHAP model (length: {} chars)", prompt.length());
                return prompt;
            } else {
                throw new RuntimeException("SHAP prompt generation failed: " + result);
            }

        } catch (Exception e) {
            log.error("Error generating SHAP prompt", e);
            // Return fallback prompt
            return generateFallbackPrompt(predictedSoh, contributors);
        }
    }

    /**
     * Get the absolute path to the Python explainer script
     */
    private String getScriptPath() {
        String scriptName = "shap_explainer.py";
        String[] possiblePaths = {
            scriptName,
            "." + File.separator + scriptName,
            System.getProperty("user.dir") + File.separator + scriptName
        };

        for (String path : possiblePaths) {
            File file = new File(path);
            if (file.exists()) {
                return file.getAbsolutePath();
            }
        }

        log.warn("Python script not found, will attempt execution from default path");
        return scriptName;
    }

    /**
     * Execute a command and capture output
     */
    private String executeCommand(List<String> command) throws IOException {
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);

        Process process = processBuilder.start();

        // Read output
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }
        }

        // Wait for process to complete
        int exitCode;
        try {
            exitCode = process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Process interrupted", e);
        }

        if (exitCode != 0) {
            throw new RuntimeException("Python script failed with exit code: " + exitCode +
                    ", output: " + output);
        }

        return output.toString().trim();
    }

    /**
     * Execute command with input passed via stdin (avoids command line escaping issues)
     */
    private String executeCommandWithInput(List<String> command, String input) throws IOException {
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);

        Process process = processBuilder.start();

        // Write input to process stdin
        try (OutputStream stdin = process.getOutputStream()) {
            stdin.write(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            stdin.flush();
        }

        // Read output
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }
        }

        // Wait for process to complete
        int exitCode;
        try {
            exitCode = process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Process interrupted", e);
        }

        if (exitCode != 0) {
            throw new RuntimeException("Python script failed with exit code: " + exitCode +
                    ", output: " + output);
        }

        return output.toString().trim();
    }

    /**
     * Generate fallback prompt when SHAP model is unavailable
     */
    private String generateFallbackPrompt(double predictedSoh, List<FeatureContribution> contributors) {
        StringBuilder prompt = new StringBuilder();

        // Identify top negative and positive contributors
        List<FeatureContribution> negativeFactors = new ArrayList<>();
        List<FeatureContribution> positiveFactors = new ArrayList<>();

        for (FeatureContribution contrib : contributors) {
            if (contrib.shap_impact < 0) {
                negativeFactors.add(contrib);
            } else {
                positiveFactors.add(contrib);
            }
        }

        // Sort by impact magnitude
        negativeFactors.sort((a, b) -> Double.compare(b.shap_impact, a.shap_impact));
        positiveFactors.sort((a, b) -> Double.compare(b.shap_impact, a.shap_impact));

        // Build prompt
        prompt.append("Generate a specific EV battery SoH explanation for the owner.\n");
        prompt.append("Do not use role-play openings such as 'As an expert'.\n\n");
        prompt.append("Battery Health Summary:\n");
        prompt.append(String.format("- Current State of Health (SoH): %.2f%%\n", predictedSoh));

        if (!negativeFactors.isEmpty()) {
            prompt.append("\nFactors negatively affecting battery:\n");
            for (int i = 0; i < Math.min(3, negativeFactors.size()); i++) {
                FeatureContribution fc = negativeFactors.get(i);
                prompt.append(String.format("  • %s (current: %.2f, impact: %.4f)\n",
                        formatFeatureName(fc.feature_name), fc.feature_value, fc.shap_impact));
            }
        }

        if (!positiveFactors.isEmpty()) {
            prompt.append("\nFactors helping battery health:\n");
            for (int i = 0; i < Math.min(2, positiveFactors.size()); i++) {
                FeatureContribution fc = positiveFactors.get(i);
                prompt.append(String.format("  • %s (current: %.2f, positive impact: %.4f)\n",
                        formatFeatureName(fc.feature_name), fc.feature_value, fc.shap_impact));
            }
        }

        prompt.append("\nReturn these sections:\n");
        prompt.append("1. SoH Interpretation: what this SoH means for current capacity/range\n");
        prompt.append("2. Root Causes: top 2-3 causes linked to the factors above\n");
        prompt.append("3. Maintenance Plan: immediate, short-term, and long-term actions\n");
        prompt.append("4. Outlook: expected 3-6 month SoH trend if actions are followed\n");
        prompt.append("Use plain text only and avoid markdown symbols like # and *.\n");
        prompt.append("End with a complete final sentence.\n");

        return prompt.toString();
    }

    /**
     * Format feature name for human readability
     */
    private String formatFeatureName(String featureName) {
        String formatted = featureName
                .replace("_", " ")
                .replaceAll("([a-z])([A-Z])", "$1 $2")
                .toLowerCase();
        return formatted.substring(0, 1).toUpperCase() + formatted.substring(1);
    }
}


