package com.ev.AI_battery.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Service to interact with XGBoost model for battery health prediction
 * Communicates with Python subprocess that loads the pickled model
 */
@Service
@Slf4j
public class XGBoostModelService {

    @Value("${xgboost.model.path:src/main/resources/ml/xgboost_battery_model.pkl}")
    private String modelPath;

    @Value("${python.executable:python}")
    private String pythonExecutable;

    private final Gson gson = new Gson();

    /**
     * Predict State of Health (SoH) using XGBoost model
     *
     * @param voltage Voltage measured in Volts (V) - typically 2.7V to 4.2V
     * @param current Current measured in Amps (A) - negative for discharge
     * @param temperature Temperature measured in Celsius (°C)
     * @param soc State of Charge in percentage (0-100)
     * @param cycleNumber Total cycle count (integer)
     * @return Predicted SoH value (0-100)
     */
    public double predictSoH(double voltage, double current, double temperature, 
                            double soc, int cycleNumber) {
        try {
            // Validate inputs
            validateInputs(voltage, current, temperature, soc, cycleNumber);
            
            // Get path to Python predictor script
            String scriptPath = getScriptPath();
            
            // Build command to execute Python script
            List<String> command = new ArrayList<>();
            command.add(pythonExecutable);
            command.add(scriptPath);
            command.add(modelPath);
            command.add(String.valueOf(voltage));
            command.add(String.valueOf(current));
            command.add(String.valueOf(temperature));
            command.add(String.valueOf(soc));
            command.add(String.valueOf(cycleNumber));
            
            // Execute and get result
            String result = executeCommand(command);
            
            // Parse JSON response
            JsonObject jsonResponse = gson.fromJson(result, JsonObject.class);
            
            if ("success".equals(jsonResponse.get("status").getAsString())) {
                double sohPrediction = jsonResponse.get("soh").getAsDouble();
                log.info("XGBoost Prediction: voltage={}, current={}, temp={}, soc={}, cycles={} -> SoH={}%",
                        voltage, current, temperature, soc, cycleNumber, sohPrediction);
                return sohPrediction;
            } else {
                throw new RuntimeException("XGBoost prediction failed: " + result);
            }
            
        } catch (Exception e) {
            log.error("Error during XGBoost prediction", e);
            // Return fallback SoH based on simple formula
            return calculateFallbackSoH(temperature, cycleNumber);
        }
    }

    /**
     * Validate input parameters are within expected ranges
     */
    private void validateInputs(double voltage, double current, double temperature,
                               double soc, int cycleNumber) {
        if (voltage < 0 || voltage > 5.0) {
            throw new IllegalArgumentException("Voltage out of range: " + voltage);
        }
        if (current < -5 || current > 5) {
            throw new IllegalArgumentException("Current out of range: " + current);
        }
        if (temperature < -20 || temperature > 60) {
            throw new IllegalArgumentException("Temperature out of range: " + temperature);
        }
        if (soc < 0 || soc > 100) {
            throw new IllegalArgumentException("SoC out of range: " + soc);
        }
        if (cycleNumber < 0) {
            throw new IllegalArgumentException("Cycle number cannot be negative: " + cycleNumber);
        }
    }

    /**
     * Get the absolute path to the Python predictor script
     */
    private String getScriptPath() {
        String scriptName = "xgboost_predictor.py";
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
        
        // If not found, return default and let execution fail with clear error
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
     * Calculate SoH using simple formula as fallback when XGBoost is unavailable
     */
    private double calculateFallbackSoH(double temperature, int cycles) {
        double degradationRate = cycles * 0.03;  // 0.03% per cycle
        double tempEffect = Math.max(0, (temperature - 25) * 0.5);  // Penalty for high temp
        double soh = 100.0 - degradationRate - tempEffect;
        
        return Math.max(70.0, Math.min(100.0, soh));
    }
}




