package za.ac.cput.VendorLink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import za.ac.cput.VendorLink.dto.request.LoginRequest;
import za.ac.cput.VendorLink.dto.request.VendorProfileRequest;
import za.ac.cput.VendorLink.dto.response.AuthResponse;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class VendorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String vendorToken;

    @BeforeEach
    void setUp() throws Exception {
        LoginRequest vendorLogin = LoginRequest.builder()
                .email("vendor@vendorlink.co.za")
                .password("Password123!")
                .build();
        MvcResult vResult = mockMvc.perform(get("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vendorLogin))
                        .requestAttr("dummy", "val"))
                .andReturn();

        // Perform real POST login
        MvcResult loginResult = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vendorLogin)))
                .andExpect(status().isOk())
                .andReturn();

        vendorToken = objectMapper.readValue(loginResult.getResponse().getContentAsString(), AuthResponse.class).getToken();
    }

    @Test
    @DisplayName("Should get and update current vendor's profile")
    void shouldGetAndUpdateVendorProfile() throws Exception {
        mockMvc.perform(get("/api/vendor/profile")
                        .header("Authorization", "Bearer " + vendorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessName").value("Lisa's Coffee Bar"));

        VendorProfileRequest updateRequest = VendorProfileRequest.builder()
                .businessName("Lisa's Specialty Coffee & Roastery")
                .description("Award-winning Ethiopian and Colombian single-origin roasts.")
                .category("Food & Beverages")
                .city("Cape Town")
                .province("Western Cape")
                .phone("+27 82 123 4567")
                .website("https://lisascoffee.co.za")
                .build();

        mockMvc.perform(put("/api/vendor/profile")
                        .header("Authorization", "Bearer " + vendorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessName").value("Lisa's Specialty Coffee & Roastery"));
    }

    @Test
    @DisplayName("Should retrieve public list of all vendors")
    void shouldGetPublicVendorsList() throws Exception {
        mockMvc.perform(get("/api/vendors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }
}
