package com.ev.AI_battery.service;

import org.springframework.stereotype.Service;

@Service
public class HealthScoreCalculator {

    public int calculate(
            double soh,
            double avgTemp,
            int cycles
    ) {
        double score = soh;
        if (avgTemp > 40) score -= 5;
        if (cycles > 800) score -= 5;

        return (int) Math.max(50, Math.min(score, 100));
    }

    public String label(int score) {
        if (score >= 85) return "Healthy";
        if (score >= 70) return "Moderate";
        return "Needs Attention";
    }
}

