package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "charging_sessions",
        indexes = {@Index(name = "idx_vehicle_start", columnList = "vehicle_id, start_time")})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class ChargingSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    // Duration calculated in service
    private Long durationMinutes;

    private Double startSoc;
    private Double endSoc;
    private Double socAdded;

    private Double energyAddedKwh;
    private Double avgPowerKw;

    @Enumerated(EnumType.STRING)
    private ChargingType chargingType;

    @Enumerated(EnumType.STRING)
    private ChargingLocation location;

    @Enumerated(EnumType.STRING)
    private TelemetrySource source;
}
