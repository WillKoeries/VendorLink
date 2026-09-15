package za.ac.cput.VendorLink.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.ac.cput.VendorLink.domain.EventStatus;
import za.ac.cput.VendorLink.dto.request.EventRequest;
import za.ac.cput.VendorLink.dto.response.DashboardStatsResponse;
import za.ac.cput.VendorLink.dto.response.EventResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.EventService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

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
