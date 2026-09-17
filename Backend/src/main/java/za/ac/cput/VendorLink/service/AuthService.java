package za.ac.cput.VendorLink.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.ac.cput.VendorLink.domain.*;
import za.ac.cput.VendorLink.dto.request.LoginRequest;
import za.ac.cput.VendorLink.dto.request.RegisterRequest;
import za.ac.cput.VendorLink.dto.response.AuthResponse;
import za.ac.cput.VendorLink.dto.response.UserResponse;
import za.ac.cput.VendorLink.exception.ResourceNotFoundException;
import za.ac.cput.VendorLink.repository.OrganizerRepository;
import za.ac.cput.VendorLink.repository.UserRepository;
import za.ac.cput.VendorLink.repository.VendorProfileRepository;
import za.ac.cput.VendorLink.security.JwtTokenProvider;
import za.ac.cput.VendorLink.util.Helper;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final VendorProfileRepository vendorProfileRepository;
    private final OrganizerRepository organizerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Prevent privilege escalation: only VENDOR and ORGANIZER roles are allowed via self-registration
        if (request.getRole() == Role.ADMIN) {
            throw new IllegalArgumentException("Cannot self-register as ADMIN. Admin accounts must be created by an existing administrator.");
        }

        if (userRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new IllegalArgumentException("An account with email " + request.getEmail() + " already exists");
        }

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole())
                .build();

        User savedUser = userRepository.save(user);

        if (request.getRole() == Role.VENDOR) {
            String bName = request.getBusinessName() != null && !request.getBusinessName().isBlank()
                    ? request.getBusinessName().trim()
                    : request.getFullName() + "'s Stall";

            VendorProfile profile = VendorProfile.builder()
                    .user(savedUser)
                    .businessName(bName)
                    .phone(request.getPhone())
                    .build();
            vendorProfileRepository.save(profile);
        } else if (request.getRole() == Role.ORGANIZER) {
            String orgName = request.getBusinessName() != null && !request.getBusinessName().isBlank()
                    ? request.getBusinessName().trim()
                    : request.getFullName() + " Events";

            Organizer organizer = Organizer.builder()
                    .user(savedUser)
                    .organizationName(orgName)
                    .phone(request.getPhone())
                    .build();
            organizerRepository.save(organizer);
        }

        String token = jwtTokenProvider.generateTokenForUser(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getRole().name()
        );

        UserResponse userResponse = Helper.toUserResponse(savedUser);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(userResponse)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail().trim().toLowerCase(),
                        request.getPassword()
                )
        );

        String token = jwtTokenProvider.generateToken(authentication);

        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(Helper.toUserResponse(user))
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return Helper.toUserResponse(user);
    }
}
