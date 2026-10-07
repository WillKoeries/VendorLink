package za.ac.cput.VendorLink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import za.ac.cput.VendorLink.domain.Role;
import za.ac.cput.VendorLink.dto.request.LoginRequest;
import za.ac.cput.VendorLink.dto.request.RegisterRequest;
import za.ac.cput.VendorLink.dto.response.AuthResponse;
import za.ac.cput.VendorLink.dto.response.UserResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.AuthService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("Should successfully register a new vendor user and return JWT token")
    void shouldRegisterNewVendor() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("New Test Vendor")
                .email("newvendor@test.com")
                .password("Password123!")
                .role(Role.VENDOR)
                .businessName("Test Bakery")
                .phone("+27 82 999 8888")
                .build();

        AuthResponse auth = AuthResponse.builder()
                .token("mock-jwt-token")
                .tokenType("Bearer")
                .user(UserResponse.builder()
                        .email("newvendor@test.com")
                        .fullName("New Test Vendor")
                        .role(Role.VENDOR)
                        .build())
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(auth);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("mock-jwt-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("newvendor@test.com"))
                .andExpect(jsonPath("$.user.role").value("VENDOR"));

        verify(authService).register(any(RegisterRequest.class));
    }

    @Test
    @DisplayName("Should login existing organizer and access /api/auth/me")
    void shouldLoginOrganizerAndAccessMe() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("organizer@vendorlink.co.za")
                .password("Password123!")
                .build();

        AuthResponse auth = AuthResponse.builder()
                .token("mock-jwt-token")
                .tokenType("Bearer")
                .user(UserResponse.builder()
                        .email("organizer@vendorlink.co.za")
                        .fullName("John Smith")
                        .role(Role.ORGANIZER)
                        .build())
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(auth);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock-jwt-token"))
                .andExpect(jsonPath("$.user.role").value("ORGANIZER"));

        CustomUserDetails userDetails = new CustomUserDetails(1L, "organizer@vendorlink.co.za", "Password123!", "ORGANIZER");
        UserResponse meResponse = UserResponse.builder()
                .id(1L)
                .email("organizer@vendorlink.co.za")
                .fullName("John Smith")
                .role(Role.ORGANIZER)
                .build();

        when(authService.getCurrentUser("organizer@vendorlink.co.za")).thenReturn(meResponse);

        mockMvc.perform(get("/api/auth/me")
                        .with(user(userDetails)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("organizer@vendorlink.co.za"))
                .andExpect(jsonPath("$.fullName").value("John Smith"));

        verify(authService).login(any(LoginRequest.class));
        verify(authService).getCurrentUser("organizer@vendorlink.co.za");
    }

    @Test
    @DisplayName("Should return 401 Unauthorized for invalid password")
    void shouldFailLoginWithBadCredentials() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("organizer@vendorlink.co.za")
                .password("WrongPassword")
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));

        verify(authService).login(any(LoginRequest.class));
    }
}
