package za.ac.cput.VendorLink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import za.ac.cput.VendorLink.domain.Role;
import za.ac.cput.VendorLink.dto.request.LoginRequest;
import za.ac.cput.VendorLink.dto.request.RegisterRequest;
import za.ac.cput.VendorLink.dto.response.AuthResponse;

import static org.assertj.core.api.Assertions.assertThat;
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

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("newvendor@test.com"))
                .andExpect(jsonPath("$.user.role").value("VENDOR"))
                .andReturn();

        AuthResponse auth = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(auth.getToken()).isNotBlank();
    }

    @Test
    @DisplayName("Should login existing seeded organizer and access /api/auth/me")
    void shouldLoginOrganizerAndAccessMe() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("organizer@vendorlink.co.za")
                .password("Password123!")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("ORGANIZER"))
                .andReturn();

        AuthResponse auth = objectMapper.readValue(loginResult.getResponse().getContentAsString(), AuthResponse.class);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + auth.getToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("organizer@vendorlink.co.za"))
                .andExpect(jsonPath("$.fullName").value("John Smith"));
    }

    @Test
    @DisplayName("Should return 401 Unauthorized for invalid password")
    void shouldFailLoginWithBadCredentials() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("organizer@vendorlink.co.za")
                .password("WrongPassword")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }
}
