package za.ac.cput.VendorLink.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import za.ac.cput.VendorLink.domain.*;
import za.ac.cput.VendorLink.dto.response.ApplicationResponse;
import za.ac.cput.VendorLink.exception.UnauthorizedAccessException;
import za.ac.cput.VendorLink.repository.ApplicationRepository;
import za.ac.cput.VendorLink.repository.EventRepository;
import za.ac.cput.VendorLink.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ApplicationService applicationService;

    private User organizer;
    private User vendor;
    private Event event;
    private Application application;

    @BeforeEach
    void setUp() {
        organizer = User.builder()
                .id(10L)
                .fullName("Sarah Organizer")
                .email("organizer@vendorlink.co.za")
                .role(Role.ORGANIZER)
                .build();

        vendor = User.builder()
                .id(20L)
                .fullName("Lisa Vendor")
                .email("lisa@vendorlink.co.za")
                .role(Role.VENDOR)
                .build();

        event = Event.builder()
                .id(100L)
                .title("Kirstenbosch Summer Market")
                .organizer(organizer)
                .totalStalls(20)
                .availableStalls(5)
                .status(EventStatus.OPEN)
                .build();

        application = Application.builder()
                .id(500L)
                .event(event)
                .vendor(vendor)
                .businessName("Lisa's Coffee")
                .productsDescription("Single origin espresso and cold brew")
                .status(ApplicationStatus.PENDING)
                .appliedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("updateApplicationStatus: approving should claim a stall and check to close if full")
    void updateApplicationStatus_shouldClaimStallWhenApproved() {
        when(applicationRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(application));
        when(eventRepository.claimStall(100L)).thenReturn(1);
        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));

        ApplicationResponse response = applicationService.updateApplicationStatus(
                500L, 10L, ApplicationStatus.APPROVED, "Approved! Welcome.");

        assertThat(response.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
        verify(eventRepository).claimStall(100L);
        verify(eventRepository).closeIfFull(100L, EventStatus.OPEN, EventStatus.CLOSED);
        verify(notificationService).createNotification(eq(vendor), anyString(), anyString(), eq("APPLICATION_APPROVED"), eq(500L));
    }

    @Test
    @DisplayName("updateApplicationStatus: should throw exception when no stalls remaining to claim")
    void updateApplicationStatus_shouldThrowWhenNoStallsAvailable() {
        when(applicationRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(application));
        when(eventRepository.claimStall(100L)).thenReturn(0); // 0 rows updated means no stalls

        assertThatThrownBy(() -> applicationService.updateApplicationStatus(
                500L, 10L, ApplicationStatus.APPROVED, "Approved!"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no stalls available for this event");

        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateApplicationStatus: changing from APPROVED to REJECTED should release stall and reopen event if space")
    void updateApplicationStatus_shouldReleaseStallWhenApprovedApplicationIsRejected() {
        application.setStatus(ApplicationStatus.APPROVED);

        when(applicationRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));

        ApplicationResponse response = applicationService.updateApplicationStatus(
                500L, 10L, ApplicationStatus.REJECTED, "Space required for different category");

        assertThat(response.getStatus()).isEqualTo(ApplicationStatus.REJECTED);
        verify(eventRepository).releaseStall(100L);
        verify(eventRepository).reopenIfSpace(100L, EventStatus.CLOSED, EventStatus.OPEN);
    }

    @Test
    @DisplayName("updateApplicationStatus: should throw UnauthorizedAccessException when caller is not the organizer")
    void updateApplicationStatus_shouldThrowWhenUnauthorized() {
        when(applicationRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> applicationService.updateApplicationStatus(
                500L, 999L, ApplicationStatus.APPROVED, "Notes"))
                .isInstanceOf(UnauthorizedAccessException.class);

        verify(eventRepository, never()).claimStall(any());
        verify(applicationRepository, never()).save(any());
    }
}
