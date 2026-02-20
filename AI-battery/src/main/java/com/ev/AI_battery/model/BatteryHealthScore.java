package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "battery_health_scores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BatteryHealthScore {
    @Id
    @GeneratedValue
    private Long id;
    @ManyToOne
    private Vehicle vehicle;
    private Double healthScore;
    private Double soh;
    private Integer rulCycles;
    private Double temperatureScore;
    private Double chargingScore;
    private LocalDateTime timestamp;
}

