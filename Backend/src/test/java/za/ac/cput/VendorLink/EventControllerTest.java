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
import za.ac.cput.VendorLink.domain.EventStatus;
import za.ac.cput.VendorLink.dto.request.EventRequest;
import za.ac.cput.VendorLink.dto.request.LoginRequest;
import za.ac.cput.VendorLink.dto.response.AuthResponse;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class EventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String organizerToken;

    @BeforeEach
    void setUp() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("organizer@vendorlink.co.za")
                .password("Password123!")
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        organizerToken = auth.getToken();
    }

    @Test
    @DisplayName("Should browse public events without authentication")
    void shouldBrowseEventsPublicly() throws Exception {
        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(4))));
    }

    @Test
    @DisplayName("Should filter events by city")
    void shouldFilterEventsByCity() throws Exception {
        mockMvc.perform(get("/api/events")
                        .param("city", "Cape Town"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].city").value("Cape Town"));
    }

    @Test
    @DisplayName("Should create event as an organizer")
    void shouldCreateEventAsOrganizer() throws Exception {
        EventRequest request = EventRequest.builder()
                .title("New Artisan Fair")
                .description("A festival for independent makers.")
                .date(LocalDate.of(2026, 11, 12))
                .time("09:00 - 16:00")
                .location("Kirstenbosch Gardens")
                .city("Cape Town")
                .province("Western Cape")
                .stallFee(new BigDecimal("300.00"))
                .totalStalls(20)
                .status(EventStatus.OPEN)
                .build();

        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + organizerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("New Artisan Fair"))
                .andExpect(jsonPath("$.availableStalls").value(20));
    }

    @Test
    @DisplayName("Should get organizer dashboard statistics")
    void shouldGetOrganizerDashboardStats() throws Exception {
        mockMvc.perform(get("/api/events/organizer/dashboard-stats")
                        .header("Authorization", "Bearer " + organizerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEvents", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.totalApplications", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.approvedVendors", greaterThanOrEqualTo(1)));
    }
}
