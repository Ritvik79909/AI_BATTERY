package com.ev.AI_battery.service;

import org.springframework.stereotype.Service;

@Service
public class RULCalculator {

    public int estimateRemainingCycles(int currentCycles) {
        int maxCycles = 1500; // conservative
        return Math.max(0, maxCycles - currentCycles);
    }

    public int estimateMonths(int remainingCycles) {
        return remainingCycles / 30;
    }

    public String confidence(int cycles) {
        return cycles > 800 ? "High" :
                cycles > 400 ? "Medium" : "Low";
    }
}

