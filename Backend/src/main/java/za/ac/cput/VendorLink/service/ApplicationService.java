package za.ac.cput.VendorLink.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.ac.cput.VendorLink.domain.*;
import za.ac.cput.VendorLink.dto.request.ApplicationRequest;
import za.ac.cput.VendorLink.dto.response.ApplicationResponse;
import za.ac.cput.VendorLink.repository.ApplicationRepository;
import za.ac.cput.VendorLink.repository.EventRepository;
import za.ac.cput.VendorLink.repository.UserRepository;
import za.ac.cput.VendorLink.util.Helper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public ApplicationResponse applyForEvent(Long vendorId, ApplicationRequest request) {
        User vendor = userRepository.findById(vendorId)
                .orElseThrow(() -> new IllegalArgumentException("Vendor user not found with ID: " + vendorId));

        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found with ID: " + request.getEventId()));

        if (event.getStatus() != EventStatus.OPEN) {
            throw new IllegalStateException("Applications are not currently open for this event");
        }

        if (event.getAvailableStalls() <= 0) {
            throw new IllegalStateException("No available stalls remaining for this event");
        }

        if (applicationRepository.existsByEventIdAndVendorId(event.getId(), vendor.getId())) {
            throw new IllegalStateException("You have already submitted an application for this event");
        }

        Application application = Application.builder()
                .event(event)
                .vendor(vendor)
                .businessName(request.getBusinessName().trim())
                .productsDescription(request.getProductsDescription().trim())
                .specialRequirements(request.getSpecialRequirements())
                .status(ApplicationStatus.PENDING)
                .build();

        Application saved = applicationRepository.save(application);

        // Notify event organizer
        notificationService.createNotification(
                event.getOrganizer(),
                "New Vendor Application",
                "New application received from " + request.getBusinessName() + " for event: " + event.getTitle(),
                "APPLICATION_RECEIVED",
                saved.getId());

        return Helper.toApplicationResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getVendorApplications(Long vendorId) {
        return applicationRepository.findByVendorIdOrderByAppliedAtDesc(vendorId)
                .stream()
                .map(Helper::toApplicationResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getEventApplications(Long eventId, Long organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with ID: " + eventId));

        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new IllegalArgumentException("You are not authorized to view applications for this event");
        }

        return applicationRepository.findByEventIdOrderByAppliedAtDesc(eventId)
                .stream()
                .map(Helper::toApplicationResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getApplicationById(Long applicationId, Long userId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + applicationId));

        boolean isApplicant = application.getVendor().getId().equals(userId);
        boolean isOrganizer = application.getEvent().getOrganizer().getId().equals(userId);

        if (!isApplicant && !isOrganizer) {
            throw new IllegalArgumentException("You are not authorized to view this application");
        }

        return Helper.toApplicationResponse(application);
    }

    @Transactional
    public ApplicationResponse updateApplicationStatus(
            Long applicationId,
            Long organizerId,
            ApplicationStatus newStatus,
            String reviewNotes) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + applicationId));

        Event event = application.getEvent();
        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new IllegalArgumentException("You are not authorized to review this application");
        }

        ApplicationStatus previousStatus = application.getStatus();

        if (newStatus == ApplicationStatus.APPROVED && previousStatus != ApplicationStatus.APPROVED) {
            if (event.getAvailableStalls() <= 0) {
                throw new IllegalStateException("Cannot approve: No stalls available for this event");
            }
            event.setAvailableStalls(event.getAvailableStalls() - 1);
            if (event.getAvailableStalls() == 0) {
                event.setStatus(EventStatus.CLOSED);
            }
            eventRepository.save(event);
        } else if (previousStatus == ApplicationStatus.APPROVED && newStatus != ApplicationStatus.APPROVED) {
            event.setAvailableStalls(event.getAvailableStalls() + 1);
            if (event.getStatus() == EventStatus.CLOSED) {
                event.setStatus(EventStatus.OPEN);
            }
            eventRepository.save(event);
        }

        application.setStatus(newStatus);
        application.setReviewNotes(reviewNotes);
        application.setReviewedAt(LocalDateTime.now());

        Application updated = applicationRepository.save(application);

        // Notify vendor
        notificationService.createNotification(
                application.getVendor(),
                "Application " + newStatus.name(),
                "Your application for '" + event.getTitle() + "' has been " + newStatus.name().toLowerCase() +
                        (reviewNotes != null && !reviewNotes.isBlank() ? ". Note: " + reviewNotes : "."),
                "APPLICATION_" + newStatus.name(),
                updated.getId());

        return Helper.toApplicationResponse(updated);
    }

    @Transactional
    public void cancelApplication(Long applicationId, Long vendorId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + applicationId));

        if (!application.getVendor().getId().equals(vendorId)) {
            throw new IllegalArgumentException("You are not authorized to cancel this application");
        }

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalStateException("Only pending applications can be cancelled");
        }

        application.setStatus(ApplicationStatus.CANCELLED);
        applicationRepository.save(application);
    }
}
