package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "charging_optimization_recommendations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ChargingOptimization {
    @Id @GeneratedValue private Long id;
    @ManyToOne private Vehicle vehicle;
    private Integer recommendedChargeLimit;
    private String recommendedChargingTime;
    private String fastChargingRecommendation;
    private String chargingFrequencyRecommendation;
    private String optimizationPriority;
    private Double estimatedLifespanExtension;
    private LocalDateTime recommendationTimestamp;
}
