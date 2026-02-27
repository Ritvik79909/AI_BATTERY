package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "anomaly_alerts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AnomalyAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    private String alertType;      // TEMPERATURE_SPIKE, VOLTAGE_DROP, SOH_DECLINE, CHARGING_PATTERN
    private String severity;        // CRITICAL, WARNING, INFO
    private String message;         // User-friendly message
    private String recommendedAction;

    private Double detectedValue;
    private Double normalMin;
    private Double normalMax;

    private LocalDateTime timestamp;
    private String status;          // ACTIVE, RESOLVED, IGNORED

    private LocalDateTime resolvedAt;
    private String resolutionNotes;
}