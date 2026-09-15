package za.ac.cput.VendorLink.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.ac.cput.VendorLink.dto.request.VendorProfileRequest;
import za.ac.cput.VendorLink.dto.response.VendorProfileResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.VendorService;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @GetMapping("/api/vendor/profile")
    public ResponseEntity<VendorProfileResponse> getMyProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        VendorProfileResponse response = vendorService.getVendorProfile(userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/api/vendor/profile")
    public ResponseEntity<VendorProfileResponse> updateMyProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody VendorProfileRequest request
    ) {
        VendorProfileResponse response = vendorService.updateVendorProfile(userDetails.getUserId(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/vendors")
    public ResponseEntity<List<VendorProfileResponse>> getAllVendors() {
        List<VendorProfileResponse> responses = vendorService.getAllVendors();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/api/vendors/{id}")
    public ResponseEntity<VendorProfileResponse> getVendorById(@PathVariable Long id) {
        VendorProfileResponse response = vendorService.getVendorProfileById(id);
        return ResponseEntity.ok(response);
    }
}
