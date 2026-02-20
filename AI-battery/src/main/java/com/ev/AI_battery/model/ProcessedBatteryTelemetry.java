package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "processed_battery_telemetry")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class ProcessedBatteryTelemetry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    private LocalDateTime timestamp;

    // Normalized values
    private Double soc;          // 0–100 %
    private Double temperature;  // °C
    private Double voltage;      // normalized V
    private Double current;      // standardized sign

    @Enumerated(EnumType.STRING)
    private ChargingState chargingState;

    @Enumerated(EnumType.STRING)
    private TelemetrySource source;

    // Data quality flags
    private Boolean isComplete;
    private Double dataQualityScore; // 0–1
}
