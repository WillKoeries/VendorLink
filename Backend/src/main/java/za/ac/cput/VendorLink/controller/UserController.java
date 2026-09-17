package za.ac.cput.VendorLink.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.ac.cput.VendorLink.dto.request.PasswordChangeRequest;
import za.ac.cput.VendorLink.dto.request.UpdateProfileRequest;
import za.ac.cput.VendorLink.dto.response.UserResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.UserService;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMyProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
        UserResponse response = userService.getUserById(userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMyProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UserResponse response = userService.updateProfile(userDetails.getUserId(), request.getFullName(), request.getPhone());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PasswordChangeRequest request
    ) {
        userService.changePassword(userDetails.getUserId(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}
