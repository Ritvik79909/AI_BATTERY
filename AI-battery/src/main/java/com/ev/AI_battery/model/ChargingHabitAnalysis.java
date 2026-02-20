package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "charging_habit_analysis")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ChargingHabitAnalysis {
    @Id @GeneratedValue private Long id;
    @ManyToOne private Vehicle vehicle;
    private Double habitScore;
    private Double fastChargingPercentage;
    private Double chargingFrequencyPerWeek;
    private Double averageChargeDepth;
    private String riskLevel;
    private LocalDateTime analysisTimestamp;
}
