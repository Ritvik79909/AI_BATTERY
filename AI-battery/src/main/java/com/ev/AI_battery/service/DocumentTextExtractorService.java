package com.ev.AI_battery.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentTextExtractorService {

    public String extractText(MultipartFile file) throws Exception {

        String contentType = file.getContentType();

        if (contentType == null) {
            throw new RuntimeException("Unknown file type");
        }

        // PDF
        if (contentType.equals("application/pdf")) {
            try (PDDocument document = PDDocument.load(file.getInputStream())) {
                return new PDFTextStripper().getText(document);
            }
        }

        // Word (.docx)
        if (contentType.equals(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )) {
            try (XWPFDocument document = new XWPFDocument(file.getInputStream())) {
                return new XWPFWordExtractor(document).getText();
            }
        }

        throw new RuntimeException("Only PDF or Word documents are supported");
    }
}
