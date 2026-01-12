package com.ev.AI_battery.service;

import com.ev.AI_battery.model.VehicleDocument;
import com.ev.AI_battery.model.DocumentStatus;
import com.ev.AI_battery.repository.VehicleDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VehicleExtractionService {

    private final VehicleDocumentRepository repo;

    @Async
    public void extract(VehicleDocument doc) {
        try {
            doc.setStatus(DocumentStatus.PROCESSING);
            repo.save(doc);

            // Simulated AI extraction result
            String extractedJson = """
            {
              "suggestedMake": "Tata",
              "suggestedModel": "Nexon EV",
              "suggestedBatteryCapacityKwh": 40,
              "suggestedYear": 2023,
              "confidence": 0.86
            }
            """;

            doc.setExtractedPayload(extractedJson);
            doc.setStatus(DocumentStatus.PROCESSED);
            repo.save(doc);

        } catch (Exception e) {
            doc.setStatus(DocumentStatus.FAILED);
            repo.save(doc);
        }
    }
}
