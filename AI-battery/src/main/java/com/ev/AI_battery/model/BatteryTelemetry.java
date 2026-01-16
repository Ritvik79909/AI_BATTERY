package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "battery_telemetry",
        indexes = {
                @Index(name = "idx_vehicle_time", columnList = "vehicle_id,timestamp")
        }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class BatteryTelemetry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Ownership
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    private LocalDateTime timestamp;

    // Core metrics
    private Double soc;               // %
    private Double temperature;       // °C
    private Double voltage;           // V
    private Double current;           // A
    private Integer cycleCount;

    @Enumerated(EnumType.STRING)
    private ChargingState chargingState;

    @Enumerated(EnumType.STRING)
    private TelemetrySource source;
}
