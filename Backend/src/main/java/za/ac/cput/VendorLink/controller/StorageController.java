package za.ac.cput.VendorLink.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import za.ac.cput.VendorLink.service.StorageService;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageController {

    private final StorageService storageService;

    @PostMapping("/upload-profile-image")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> uploadProfileImage(@RequestParam("file") MultipartFile file) {
        String publicUrl = storageService.uploadProfileImage(file);
        return ResponseEntity.ok(Map.of("url", publicUrl, "imageUrl", publicUrl));
    }

    @PostMapping("/upload-event-image")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<Map<String, String>> uploadEventImage(@RequestParam("file") MultipartFile file) {
        String publicUrl = storageService.uploadEventImage(file);
        return ResponseEntity.ok(Map.of("url", publicUrl, "imageUrl", publicUrl, "bannerImageUrl", publicUrl));
    }
}
