package com.ev.AI_battery.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vehicle_documents")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class VehicleDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    private String fileName;
    private String fileType;
    private Long fileSize;
    private String storagePath;

    @Enumerated(EnumType.STRING)
    private DocumentType documentType;

    @Enumerated(EnumType.STRING)
    private DocumentStatus status;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String extractedPayload; // JSON string
}
