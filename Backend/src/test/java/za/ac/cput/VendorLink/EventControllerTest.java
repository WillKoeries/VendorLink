package za.ac.cput.VendorLink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import za.ac.cput.VendorLink.domain.EventStatus;
import za.ac.cput.VendorLink.dto.request.EventRequest;
import za.ac.cput.VendorLink.dto.response.DashboardStatsResponse;
import za.ac.cput.VendorLink.dto.response.EventResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.EventService;
import za.ac.cput.VendorLink.service.StorageService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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

    @MockBean
    private EventService eventService;

    @MockBean
    private StorageService storageService;

    private final CustomUserDetails organizerUser = new CustomUserDetails(
            1L, "organizer@vendorlink.co.za", "Password123!", "ORGANIZER"
    );

    @Test
    @DisplayName("Should browse public events without authentication")
    void shouldBrowseEventsPublicly() throws Exception {
        List<EventResponse> mockEvents = List.of(
                EventResponse.builder().id(1L).title("Summer Market").city("Cape Town").status(EventStatus.OPEN).build(),
                EventResponse.builder().id(2L).title("Craft Fair").city("Cape Town").status(EventStatus.OPEN).build(),
                EventResponse.builder().id(3L).title("Makers Market").city("Johannesburg").status(EventStatus.OPEN).build(),
                EventResponse.builder().id(4L).title("Beachside Bazaar").city("Durban").status(EventStatus.OPEN).build()
        );
        when(eventService.searchEvents(null, null, null, null, null, null)).thenReturn(mockEvents);

        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(4))));

        verify(eventService).searchEvents(null, null, null, null, null, null);
    }

    @Test
    @DisplayName("Should filter events by city")
    void shouldFilterEventsByCity() throws Exception {
        List<EventResponse> mockEvents = List.of(
                EventResponse.builder().id(1L).title("Summer Market").city("Cape Town").status(EventStatus.OPEN).build()
        );
        when(eventService.searchEvents(null, null, null, "Cape Town", null, null)).thenReturn(mockEvents);

        mockMvc.perform(get("/api/events")
                        .param("city", "Cape Town"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].city").value("Cape Town"));

        verify(eventService).searchEvents(null, null, null, "Cape Town", null, null);
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

        EventResponse createdResponse = EventResponse.builder()
                .id(10L)
                .title("New Artisan Fair")
                .availableStalls(20)
                .totalStalls(20)
                .status(EventStatus.OPEN)
                .build();

        when(eventService.createEvent(eq(1L), any(EventRequest.class))).thenReturn(createdResponse);

        mockMvc.perform(post("/api/events")
                        .with(user(organizerUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("New Artisan Fair"))
                .andExpect(jsonPath("$.availableStalls").value(20));

        verify(eventService).createEvent(eq(1L), any(EventRequest.class));
    }

    @Test
    @DisplayName("Should get organizer dashboard statistics")
    void shouldGetOrganizerDashboardStats() throws Exception {
        DashboardStatsResponse stats = DashboardStatsResponse.builder()
                .totalEvents(3)
                .totalApplications(5)
                .approvedVendors(4)
                .build();

        when(eventService.getOrganizerDashboardStats(1L)).thenReturn(stats);

        mockMvc.perform(get("/api/events/organizer/dashboard-stats")
                        .with(user(organizerUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEvents", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.totalApplications", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.approvedVendors", greaterThanOrEqualTo(1)));

        verify(eventService).getOrganizerDashboardStats(1L);
    }

    @Test
    @DisplayName("Should upload event image and return Supabase CDN URL")
    void shouldUploadEventImageSuccessfully() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "banner.png", "image/png", "fake-image-bytes".getBytes()
        );
        String expectedUrl = "https://ahyhdieaxbhwlreepogy.supabase.co/storage/v1/object/public/event-images/event_test.png";

        when(storageService.uploadEventImage(any())).thenReturn(expectedUrl);

        mockMvc.perform(multipart("/api/events/upload-image")
                        .file(file)
                        .with(user(organizerUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(expectedUrl))
                .andExpect(jsonPath("$.imageUrl").value(expectedUrl))
                .andExpect(jsonPath("$.bannerImageUrl").value(expectedUrl));

        verify(storageService).uploadEventImage(any());
    }
}
