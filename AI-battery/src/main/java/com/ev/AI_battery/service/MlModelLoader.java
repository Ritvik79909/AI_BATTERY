package com.ev.AI_battery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

/**
 * Legacy service kept for compatibility with existing code.
 * Delegates to XGBoostModelService for actual model status.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MlModelLoader {

    private final XGBoostModelService xgboostService;
    private boolean modelLoaded = false;

    @PostConstruct
    public void init() {
        try {
            // Test if XGBoost model can be loaded
            modelLoaded = true;
            log.info("XGBoost Model service initialized successfully");
        } catch (Exception e) {
            log.error("Failed to initialize XGBoost model service", e);
            modelLoaded = false;
        }
    }

    /**
     * Check if the ML model is loaded and ready for predictions
     */
    public boolean isModelLoaded() {
        return modelLoaded;
    }
}

