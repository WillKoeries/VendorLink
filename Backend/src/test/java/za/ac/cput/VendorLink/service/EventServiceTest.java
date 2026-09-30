package za.ac.cput.VendorLink.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import za.ac.cput.VendorLink.domain.*;
import za.ac.cput.VendorLink.dto.request.EventRequest;
import za.ac.cput.VendorLink.dto.response.EventResponse;
import za.ac.cput.VendorLink.exception.ResourceNotFoundException;
import za.ac.cput.VendorLink.exception.UnauthorizedAccessException;
import za.ac.cput.VendorLink.repository.ApplicationRepository;
import za.ac.cput.VendorLink.repository.CategoryRepository;
import za.ac.cput.VendorLink.repository.EventRepository;
import za.ac.cput.VendorLink.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EventServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @InjectMocks
    private EventService eventService;

    private User organizer;
    private Category category;
    private Event event;

    @BeforeEach
    void setUp() {
        organizer = User.builder()
                .id(10L)
                .fullName("Sarah Organizer")
                .email("organizer@vendorlink.co.za")
                .role(Role.ORGANIZER)
                .build();

        category = Category.builder()
                .id(1L)
                .name("Food & Beverages")
                .build();

        event = Event.builder()
                .id(100L)
                .title("Kirstenbosch Summer Market")
                .description("Artisan food & craft market")
                .organizer(organizer)
                .category(category)
                .date(LocalDate.of(2026, 12, 1))
                .time("09:00 - 17:00")
                .location("Kirstenbosch Botanical Gardens")
                .city("Cape Town")
                .province("Western Cape")
                .stallFee(new BigDecimal("350.00"))
                .totalStalls(50)
                .availableStalls(50)
                .status(EventStatus.OPEN)
                .build();
    }

    @Test
    @DisplayName("updateEvent: should acquire lock and derive availableStalls as total minus approved applications")
    void updateEvent_shouldLockRowAndDeriveAvailableStallsFromApprovedCount() {
        EventRequest request = EventRequest.builder()
                .title("Kirstenbosch Summer Market - Updated")
                .description("Updated description")
                .date(LocalDate.of(2026, 12, 2))
                .time("10:00 - 18:00")
                .location("Kirstenbosch Botanical Gardens")
                .city("Cape Town")
                .province("Western Cape")
                .stallFee(new BigDecimal("350.00"))
                .totalStalls(50)
                .status(EventStatus.OPEN)
                .build();

        when(eventRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(event));
        when(applicationRepository.countByEventIdAndStatus(100L, ApplicationStatus.APPROVED)).thenReturn(30L);
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EventResponse response = eventService.updateEvent(100L, 10L, request);

        // Verify locking query was used
        verify(eventRepository).findByIdForUpdate(100L);
        verify(eventRepository, never()).findById(100L);

        // Verify approved count was queried
        verify(applicationRepository).countByEventIdAndStatus(100L, ApplicationStatus.APPROVED);

        // Verify availability is 50 - 30 = 20, not reset to 50
        assertThat(response.getTotalStalls()).isEqualTo(50);
        assertThat(response.getAvailableStalls()).isEqualTo(20);
        assertThat(response.getStatus()).isEqualTo(EventStatus.OPEN);
        assertThat(response.getTitle()).isEqualTo("Kirstenbosch Summer Market - Updated");
    }

    @Test
    @DisplayName("updateEvent: should reject requested totalStalls lower than already approved applications count")
    void updateEvent_shouldRejectTotalStallsLowerThanApprovedCount() {
        EventRequest request = EventRequest.builder()
                .title("Kirstenbosch Summer Market")
                .description("Updated description")
                .date(LocalDate.of(2026, 12, 2))
                .time("10:00 - 18:00")
                .location("Kirstenbosch Botanical Gardens")
                .city("Cape Town")
                .province("Western Cape")
                .stallFee(new BigDecimal("350.00"))
                .totalStalls(25) // Less than the 30 approved
                .status(EventStatus.OPEN)
                .build();

        when(eventRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(event));
        when(applicationRepository.countByEventIdAndStatus(100L, ApplicationStatus.APPROVED)).thenReturn(30L);

        assertThatThrownBy(() -> eventService.updateEvent(100L, 10L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Total stalls cannot be lower than the 30 already approved");

        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateEvent: should automatically close event if derived availableStalls reaches 0")
    void updateEvent_shouldCloseEventWhenAvailableStallsReachesZero() {
        EventRequest request = EventRequest.builder()
                .title("Kirstenbosch Summer Market")
                .description("Updated description")
                .date(LocalDate.of(2026, 12, 2))
                .time("10:00 - 18:00")
                .location("Kirstenbosch Botanical Gardens")
                .city("Cape Town")
                .province("Western Cape")
                .stallFee(new BigDecimal("350.00"))
                .totalStalls(30) // Exactly equal to approved count
                .status(EventStatus.OPEN)
                .build();

        when(eventRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(event));
        when(applicationRepository.countByEventIdAndStatus(100L, ApplicationStatus.APPROVED)).thenReturn(30L);
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EventResponse response = eventService.updateEvent(100L, 10L, request);

        assertThat(response.getAvailableStalls()).isEqualTo(0);
        assertThat(response.getStatus()).isEqualTo(EventStatus.CLOSED);
    }

    @Test
    @DisplayName("updateEvent: should throw UnauthorizedAccessException when user is not the organizer")
    void updateEvent_shouldThrowUnauthorizedWhenUserIsNotOrganizer() {
        EventRequest request = EventRequest.builder()
                .title("Hacked Title")
                .build();

        when(eventRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> eventService.updateEvent(100L, 999L, request))
                .isInstanceOf(UnauthorizedAccessException.class);

        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateEvent: should throw ResourceNotFoundException when event does not exist")
    void updateEvent_shouldThrowResourceNotFoundWhenEventDoesNotExist() {
        EventRequest request = EventRequest.builder()
                .title("Non-existent Event")
                .build();

        when(eventRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.updateEvent(999L, 10L, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("createEvent: should initialize availableStalls equal to totalStalls")
    void createEvent_shouldSetAvailableStallsEqualToTotalStalls() {
        EventRequest request = EventRequest.builder()
                .title("New Artisan Fair")
                .description("Handmade crafts fair")
                .categoryId(1L)
                .date(LocalDate.of(2026, 11, 15))
                .time("08:00 - 16:00")
                .location("Green Point Park")
                .city("Cape Town")
                .province("Western Cape")
                .stallFee(new BigDecimal("200.00"))
                .totalStalls(40)
                .status(EventStatus.OPEN)
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(organizer));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> {
            Event saved = invocation.getArgument(0);
            saved.setId(101L);
            return saved;
        });

        EventResponse response = eventService.createEvent(10L, request);

        assertThat(response.getId()).isEqualTo(101L);
        assertThat(response.getTotalStalls()).isEqualTo(40);
        assertThat(response.getAvailableStalls()).isEqualTo(40);
        assertThat(response.getStatus()).isEqualTo(EventStatus.OPEN);
    }

    @Test
    @DisplayName("deleteEvent: should set event status to CANCELLED")
    void deleteEvent_shouldSetStatusToCancelled() {
        when(eventRepository.findById(100L)).thenReturn(Optional.of(event));

        eventService.deleteEvent(100L, 10L);

        assertThat(event.getStatus()).isEqualTo(EventStatus.CANCELLED);
        verify(eventRepository).save(event);
    }
}
