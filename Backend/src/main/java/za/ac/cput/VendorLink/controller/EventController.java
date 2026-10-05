package za.ac.cput.VendorLink.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import za.ac.cput.VendorLink.domain.EventStatus;
import za.ac.cput.VendorLink.dto.request.EventRequest;
import za.ac.cput.VendorLink.dto.response.DashboardStatsResponse;
import za.ac.cput.VendorLink.dto.response.EventResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.EventService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @PostMapping("/upload-image")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty"));
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only image files are allowed"));
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "File size exceeds 5MB limit"));
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            }
            if (!Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif").contains(ext)) {
                ext = ".jpg";
            }
            String filename = "event_" + UUID.randomUUID().toString() + ext;

            Path uploadDir = Paths.get("uploads/events").toAbsolutePath().normalize();
            Files.createDirectories(uploadDir);
            Path targetPath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            Path feUploads = Paths.get("Frontend/images/uploads").toAbsolutePath().normalize();
            if (Files.exists(feUploads.getParent())) {
                Files.createDirectories(feUploads);
                Files.copy(targetPath, feUploads.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            }
            Path beUploads = Paths.get("Backend/src/main/resources/static/images/uploads").toAbsolutePath().normalize();
            if (Files.exists(beUploads.getParent())) {
                Files.createDirectories(beUploads);
                Files.copy(targetPath, beUploads.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            }

            String publicUrl = "/uploads/events/" + filename;
            return ResponseEntity.ok(Map.of(
                    "url", publicUrl,
                    "imageUrl", publicUrl,
                    "bannerImageUrl", publicUrl,
                    "filename", filename
            ));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload image: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<EventResponse>> getEvents(
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String search
    ) {
        List<EventResponse> events = eventService.searchEvents(status, categoryId, province, city, date, search);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long id) {
        EventResponse event = eventService.getEventById(id);
        return ResponseEntity.ok(event);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<EventResponse> createEvent(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody EventRequest request
    ) {
        EventResponse response = eventService.createEvent(userDetails.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody EventRequest request
    ) {
        EventResponse response = eventService.updateEvent(id, userDetails.getUserId(), request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        eventService.deleteEvent(id, userDetails.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/organizer/my-events")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<List<EventResponse>> getMyEvents(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<EventResponse> events = eventService.getOrganizerEvents(userDetails.getUserId());
        return ResponseEntity.ok(events);
    }

    @GetMapping("/organizer/dashboard-stats")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<DashboardStatsResponse> getOrganizerDashboardStats(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DashboardStatsResponse stats = eventService.getOrganizerDashboardStats(userDetails.getUserId());
        return ResponseEntity.ok(stats);
    }
}
