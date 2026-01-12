package com.ev.AI_battery.controller;

import com.ev.AI_battery.model.*;
import com.ev.AI_battery.repository.VehicleDocumentRepository;
import com.ev.AI_battery.service.FileStorageService;
import com.ev.AI_battery.service.VehicleExtractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/vehicles/documents")
@RequiredArgsConstructor
public class VehicleDocumentController {

    private final FileStorageService storageService;
    private final VehicleDocumentRepository repo;
    private final VehicleExtractionService extractionService;

    @PostMapping("/upload")
    public VehicleDocument upload(
            @AuthenticationPrincipal User user,
            @RequestParam MultipartFile file,
            @RequestParam(required = false) DocumentType documentType
    ) throws Exception {

        String path = storageService.store(file);

        VehicleDocument doc = new VehicleDocument();
        doc.setUser(user);
        doc.setFileName(file.getOriginalFilename());
        doc.setFileType(file.getContentType());
        doc.setFileSize(file.getSize());
        doc.setStoragePath(path);
        doc.setDocumentType(documentType);
        doc.setStatus(DocumentStatus.UPLOADED);

        repo.save(doc);
        extractionService.extract(doc);

        return doc;
    }

    @GetMapping("/{id}/draft")
    public VehicleDocument getDraft(@PathVariable Long id) {
        return repo.findById(id).orElseThrow();
    }
}
