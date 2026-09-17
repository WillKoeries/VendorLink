package za.ac.cput.VendorLink;

import com.fasterxml.jackson.core.type.TypeReference;
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
import za.ac.cput.VendorLink.domain.ApplicationStatus;
import za.ac.cput.VendorLink.domain.Event;
import za.ac.cput.VendorLink.dto.request.ApplicationRequest;
import za.ac.cput.VendorLink.dto.request.ApplicationStatusUpdateRequest;
import za.ac.cput.VendorLink.dto.request.LoginRequest;
import za.ac.cput.VendorLink.dto.response.ApplicationResponse;
import za.ac.cput.VendorLink.dto.response.AuthResponse;
import za.ac.cput.VendorLink.dto.response.NotificationResponse;
import za.ac.cput.VendorLink.repository.EventRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ApplicationWorkflowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EventRepository eventRepository;

    private String vendorToken;
    private String organizerToken;

    @BeforeEach
    void setUp() throws Exception {
        LoginRequest vendorLogin = LoginRequest.builder()
                .email("vendor@vendorlink.co.za")
                .password("Password123!")
                .build();
        MvcResult vResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vendorLogin)))
                .andExpect(status().isOk())
                .andReturn();
        vendorToken = objectMapper.readValue(vResult.getResponse().getContentAsString(), AuthResponse.class).getToken();

        LoginRequest organizerLogin = LoginRequest.builder()
                .email("organizer@vendorlink.co.za")
                .password("Password123!")
                .build();
        MvcResult oResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(organizerLogin)))
                .andExpect(status().isOk())
                .andReturn();
        organizerToken = objectMapper.readValue(oResult.getResponse().getContentAsString(), AuthResponse.class).getToken();
    }

    @Test
    @DisplayName("Complete workflow: apply for event -> organizer approves -> notification generated -> mark read")
    void shouldExecuteCompleteApplicationWorkflow() throws Exception {
        // Find an open event: Food Truck Festival
        List<Event> events = eventRepository.findAll();
        Event targetEvent = events.stream()
                .filter(e -> e.getTitle().contains("Food Truck Festival"))
                .findFirst()
                .orElseThrow();

        int initialStalls = targetEvent.getAvailableStalls();

        // 1. Vendor applies
        ApplicationRequest appRequest = ApplicationRequest.builder()
                .eventId(targetEvent.getId())
                .businessName("Lisa's Mobile Brews")
                .productsDescription("Gourmet iced matcha and cold brew coffee.")
                .specialRequirements("Quiet location away from loud speakers.")
                .build();

        MvcResult applyResult = mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + vendorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(appRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();

        ApplicationResponse appResponse = objectMapper.readValue(
                applyResult.getResponse().getContentAsString(), ApplicationResponse.class);

        // 2. Organizer approves application
        ApplicationStatusUpdateRequest statusUpdate = ApplicationStatusUpdateRequest.builder()
                .status(ApplicationStatus.APPROVED)
                .reviewNotes("Approved! Looking forward to your beverages.")
                .build();

        mockMvc.perform(patch("/api/applications/" + appResponse.getId() + "/status")
                        .header("Authorization", "Bearer " + organizerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // Verify available stalls decremented
        Event updatedEvent = eventRepository.findById(targetEvent.getId()).orElseThrow();
        assertThat(updatedEvent.getAvailableStalls()).isEqualTo(initialStalls - 1);

        // 3. Vendor checks notifications
        MvcResult notifResult = mockMvc.perform(get("/api/notifications")
                        .header("Authorization", "Bearer " + vendorToken))
                .andExpect(status().isOk())
                .andReturn();

        List<NotificationResponse> notifications = objectMapper.readValue(
                notifResult.getResponse().getContentAsString(),
                new TypeReference<List<NotificationResponse>>() {}
        );

        assertThat(notifications).isNotEmpty();
        NotificationResponse latest = notifications.get(0);
        assertThat(latest.getTitle()).contains("APPROVED");

        // 4. Vendor marks notification as read
        mockMvc.perform(patch("/api/notifications/" + latest.getId() + "/read")
                        .header("Authorization", "Bearer " + vendorToken))
                .andExpect(status().isNoContent());
    }
}
