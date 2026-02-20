package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "battery_health_predictions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BatteryHealthPrediction {
    @Id
    @GeneratedValue
    private Long id;
    @ManyToOne
    private Vehicle vehicle;
    private Double sohValue;
    private Double rulCycles;
    private Double estimatedMonths;
    private LocalDateTime predictionTimestamp;
    private String source;
    private Double degradationRate;
}

