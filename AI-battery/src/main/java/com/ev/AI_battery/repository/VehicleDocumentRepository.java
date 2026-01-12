package com.ev.AI_battery.repository;

import com.ev.AI_battery.model.VehicleDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleDocumentRepository extends JpaRepository<VehicleDocument, Long> {
}
