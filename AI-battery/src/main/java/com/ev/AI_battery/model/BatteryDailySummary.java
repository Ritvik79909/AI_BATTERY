package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "battery_daily_summary",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"vehicle_id", "date"}
        ))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class BatteryDailySummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Vehicle vehicle;

    private LocalDate date;

    private Double avgSoc;
    private Double maxTemperature;
    private Double avgVoltage;
    private Double totalChargeCurrent; // proxy for charging duration

    private Integer dailyCycleIncrement;
}
