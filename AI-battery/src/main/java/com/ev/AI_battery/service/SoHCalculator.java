package com.ev.AI_battery.service;

import org.springframework.stereotype.Service;

@Service
public class SoHCalculator {

    public double calculate(
            double avgTemp,
            int cycleCount
    ) {
        double degradation = (cycleCount * 0.02);
        double tempPenalty = avgTemp > 35 ? 3 : 0;

        double soh = 100 - degradation - tempPenalty;
        return Math.max(70, Math.min(soh, 100));
    }

    public String label(double soh) {
        if (soh >= 90) return "Excellent";
        if (soh >= 80) return "Good";
        if (soh >= 70) return "Moderate";
        return "Poor";
    }
}

