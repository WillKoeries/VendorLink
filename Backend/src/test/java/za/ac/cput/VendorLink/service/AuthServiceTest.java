package za.ac.cput.VendorLink.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import za.ac.cput.VendorLink.domain.Role;
import za.ac.cput.VendorLink.domain.User;
import za.ac.cput.VendorLink.domain.VendorProfile;
import za.ac.cput.VendorLink.dto.request.LoginRequest;
import za.ac.cput.VendorLink.dto.request.RegisterRequest;
import za.ac.cput.VendorLink.dto.response.AuthResponse;
import za.ac.cput.VendorLink.dto.response.UserResponse;
import za.ac.cput.VendorLink.exception.ResourceNotFoundException;
import za.ac.cput.VendorLink.repository.OrganizerRepository;
import za.ac.cput.VendorLink.repository.UserRepository;
import za.ac.cput.VendorLink.repository.VendorProfileRepository;
import za.ac.cput.VendorLink.security.JwtTokenProvider;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private VendorProfileRepository vendorProfileRepository;

    @Mock
    private OrganizerRepository organizerRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .fullName("Lisa Vendor")
                .email("lisa@vendorlink.co.za")
                .password("encodedPassword")
                .role(Role.VENDOR)
                .build();
    }

    @Test
    @DisplayName("register: should register vendor and create vendor profile")
    void register_shouldRegisterVendorSuccessfully() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Lisa Vendor")
                .email("lisa@vendorlink.co.za")
                .password("Password123!")
                .role(Role.VENDOR)
                .businessName("Lisa's Coffee")
                .phone("+27 82 123 4567")
                .build();

        when(userRepository.existsByEmail("lisa@vendorlink.co.za")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(jwtTokenProvider.generateTokenForUser(anyLong(), anyString(), anyString())).thenReturn("jwt-token-123");

        AuthResponse response = authService.register(request);

        assertThat(response.getToken()).isEqualTo("jwt-token-123");
        assertThat(response.getUser().getEmail()).isEqualTo("lisa@vendorlink.co.za");
        verify(vendorProfileRepository).save(any(VendorProfile.class));
    }

    @Test
    @DisplayName("register: should reject self-registration as ADMIN")
    void register_shouldRejectAdminRegistration() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Hacker Admin")
                .email("admin@test.com")
                .password("Password123!")
                .role(Role.ADMIN)
                .build();

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot self-register as ADMIN");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("register: should reject duplicate email")
    void register_shouldRejectDuplicateEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Lisa Vendor")
                .email("lisa@vendorlink.co.za")
                .password("Password123!")
                .role(Role.VENDOR)
                .build();

        when(userRepository.existsByEmail("lisa@vendorlink.co.za")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("login: should authenticate and return JWT token")
    void login_shouldAuthenticateAndReturnToken() {
        LoginRequest request = LoginRequest.builder()
                .email("lisa@vendorlink.co.za")
                .password("Password123!")
                .build();

        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(userRepository.findByEmail("lisa@vendorlink.co.za")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateToken(auth)).thenReturn("jwt-token-456");

        AuthResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("jwt-token-456");
        assertThat(response.getUser().getEmail()).isEqualTo("lisa@vendorlink.co.za");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    @DisplayName("getCurrentUser: should return user response when found")
    void getCurrentUser_shouldReturnUser() {
        when(userRepository.findByEmail("lisa@vendorlink.co.za")).thenReturn(Optional.of(user));

        UserResponse response = authService.getCurrentUser("lisa@vendorlink.co.za");

        assertThat(response.getEmail()).isEqualTo("lisa@vendorlink.co.za");
        assertThat(response.getFullName()).isEqualTo("Lisa Vendor");
        verify(userRepository).findByEmail("lisa@vendorlink.co.za");
    }

    @Test
    @DisplayName("getCurrentUser: should throw ResourceNotFoundException when user not found")
    void getCurrentUser_shouldThrowWhenNotFound() {
        when(userRepository.findByEmail("ghost@vendorlink.co.za")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getCurrentUser("ghost@vendorlink.co.za"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
