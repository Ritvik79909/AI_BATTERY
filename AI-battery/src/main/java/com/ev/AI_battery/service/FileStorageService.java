package com.ev.AI_battery.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.*;

@Service
public class FileStorageService {

    private final Path root = Paths.get("uploads");

    public String store(MultipartFile file) throws Exception {
        Files.createDirectories(root);
        Path dest = root.resolve(file.getOriginalFilename());
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        return dest.toString();
    }
}
