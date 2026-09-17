package za.ac.cput.VendorLink.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.ac.cput.VendorLink.dto.request.ApplicationRequest;
import za.ac.cput.VendorLink.dto.request.ApplicationStatusUpdateRequest;
import za.ac.cput.VendorLink.dto.response.ApplicationResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.ApplicationService;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    public ResponseEntity<ApplicationResponse> applyForEvent(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ApplicationRequest request
    ) {
        ApplicationResponse response = applicationService.applyForEvent(userDetails.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    public ResponseEntity<List<ApplicationResponse>> getMyApplications(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<ApplicationResponse> applications = applicationService.getVendorApplications(userDetails.getUserId());
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<List<ApplicationResponse>> getEventApplications(
            @PathVariable Long eventId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<ApplicationResponse> applications = applicationService.getEventApplications(eventId, userDetails.getUserId());
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getApplicationById(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        ApplicationResponse response = applicationService.getApplicationById(id, userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApplicationResponse> updateStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ApplicationStatusUpdateRequest request
    ) {
        ApplicationResponse response = applicationService.updateApplicationStatus(
                id,
                userDetails.getUserId(),
                request.getStatus(),
                request.getReviewNotes()
        );
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    public ResponseEntity<Void> cancelApplication(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        applicationService.cancelApplication(id, userDetails.getUserId());
        return ResponseEntity.noContent().build();
    }
}
