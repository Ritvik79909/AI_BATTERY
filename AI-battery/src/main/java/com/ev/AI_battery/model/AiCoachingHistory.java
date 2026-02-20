package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_coaching_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AiCoachingHistory {
    @Id @GeneratedValue private Long id;
    @ManyToOne private Vehicle vehicle;
    private String question;
    @Column(columnDefinition = "TEXT") private String answer;
    private String issueType;
    private LocalDateTime timestamp;
}
