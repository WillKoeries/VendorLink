package za.ac.cput.VendorLink.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.ac.cput.VendorLink.domain.*;
import za.ac.cput.VendorLink.dto.request.ApplicationRequest;
import za.ac.cput.VendorLink.dto.response.ApplicationResponse;
import za.ac.cput.VendorLink.exception.ResourceNotFoundException;
import za.ac.cput.VendorLink.exception.UnauthorizedAccessException;
import za.ac.cput.VendorLink.repository.ApplicationRepository;
import za.ac.cput.VendorLink.repository.EventRepository;
import za.ac.cput.VendorLink.repository.UserRepository;
import za.ac.cput.VendorLink.util.Helper;

import java.time.LocalDateTime;
import java.math.BigDecimal;
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
                .orElseThrow(() -> new ResourceNotFoundException("User", vendorId));
        if (vendor.getRole() != Role.VENDOR) {
            throw new UnauthorizedAccessException("submit", "vendor application");
        }

        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", request.getEventId()));

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
    public ApplicationResponse getVendorApplicationForEvent(Long vendorId, Long eventId) {
        return applicationRepository.findByEventIdAndVendorId(eventId, vendorId)
                .map(Helper::toApplicationResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getOrganizerApplications(Long organizerId) {
        return applicationRepository.findByEvent_Organizer_IdOrderByAppliedAtDesc(organizerId)
                .stream()
                .map(Helper::toApplicationResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getEventApplications(Long eventId, Long organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new UnauthorizedAccessException("view applications for", "event");
        }

        return applicationRepository.findByEventIdOrderByAppliedAtDesc(eventId)
                .stream()
                .map(Helper::toApplicationResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getApplicationById(Long applicationId, Long userId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", applicationId));

        boolean isApplicant = application.getVendor().getId().equals(userId);
        boolean isOrganizer = application.getEvent().getOrganizer().getId().equals(userId);

        if (!isApplicant && !isOrganizer) {
            throw new UnauthorizedAccessException("view", "application");
        }

        return Helper.toApplicationResponse(application);
    }

    @Transactional
    public ApplicationResponse updateApplicationStatus(Long applicationId, Long organizerId,
                                                       ApplicationStatus newStatus, String reviewNotes) {
        Application application = applicationRepository.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", applicationId));

        Event event = application.getEvent();
        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new UnauthorizedAccessException("review", "application");
        }

        ApplicationStatus previous = application.getStatus();
        if (previous == newStatus) {
            return Helper.toApplicationResponse(application);           // idempotent retry
        }
        if (!previous.organizerMayMoveTo(newStatus)) {
            throw new IllegalStateException("Cannot change an application from " + previous + " to " + newStatus);
        }

        if (newStatus == ApplicationStatus.APPROVED) {
            if (event.getStatus() == EventStatus.CANCELLED || event.getStatus() == EventStatus.COMPLETED) {
                throw new IllegalStateException("Cannot approve applications for a " + event.getStatus() + " event");
            }
            if (eventRepository.claimStall(event.getId()) == 0) {
                throw new IllegalStateException("Cannot approve: no stalls available for this event");
            }
            eventRepository.closeIfFull(event.getId(), EventStatus.OPEN, EventStatus.CLOSED);
            BigDecimal fee = event.getStallFee() == null ? BigDecimal.ZERO : event.getStallFee();
            application.setPaymentAmount(fee);
            application.setPaymentStatus(fee.signum() > 0
                    ? ApplicationPaymentStatus.UNPAID : ApplicationPaymentStatus.NOT_REQUIRED);
            application.setMerchantPaymentId(null);
            application.setPfPaymentId(null);
            application.setPaymentCompletedAt(null);
        } else if (previous == ApplicationStatus.APPROVED) {
            if (application.getPaymentStatus() == ApplicationPaymentStatus.PENDING
                    || application.getPaymentStatus() == ApplicationPaymentStatus.PAID) {
                throw new IllegalStateException("This application has a payment in progress or has been paid. Resolve the payment before rejecting it.");
            }
            eventRepository.releaseStall(event.getId());
            eventRepository.reopenIfSpace(event.getId(), EventStatus.CLOSED, EventStatus.OPEN);
            application.setPaymentStatus(ApplicationPaymentStatus.NOT_REQUIRED);
            application.setPaymentAmount(null);
            application.setMerchantPaymentId(null);
        }

        application.setStatus(newStatus);
        application.setReviewNotes(reviewNotes);
        application.setReviewedAt(LocalDateTime.now());
        Application updated = applicationRepository.save(application);

        notificationService.createNotification(
                application.getVendor(),
                "Application " + newStatus.name(),
                "Your application for '" + event.getTitle() + "' has been " + newStatus.name().toLowerCase() +
                        (newStatus == ApplicationStatus.APPROVED && application.getPaymentStatus() == ApplicationPaymentStatus.UNPAID
                                ? ". Pay the stall fee from your dashboard to confirm your place" : "") +
                        (reviewNotes != null && !reviewNotes.isBlank() ? ". Note: " + reviewNotes : "."),
                "APPLICATION_" + newStatus.name(),
                updated.getId());

        return Helper.toApplicationResponse(updated);
    }

    @Transactional
    public void cancelApplication(Long applicationId, Long vendorId) {
        Application application = applicationRepository.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", applicationId));

        if (!application.getVendor().getId().equals(vendorId)) {
            throw new UnauthorizedAccessException("cancel", "application");
        }

        ApplicationStatus previous = application.getStatus();
        if (previous != ApplicationStatus.PENDING && previous != ApplicationStatus.APPROVED) {
            throw new IllegalStateException("Only pending or approved applications can be withdrawn");
        }
        if (previous == ApplicationStatus.APPROVED) {
            eventRepository.releaseStall(application.getEvent().getId());
            eventRepository.reopenIfSpace(application.getEvent().getId(), EventStatus.CLOSED, EventStatus.OPEN);
            if (application.getPaymentStatus() == ApplicationPaymentStatus.PAID
                    || application.getPaymentStatus() == ApplicationPaymentStatus.PENDING) {
                // Keep the payment reference so a late PayFast ITN can still be reconciled.
                application.setPaymentStatus(ApplicationPaymentStatus.REFUND_PENDING);
            } else if (application.getPaymentStatus() == ApplicationPaymentStatus.UNPAID) {
                application.setPaymentStatus(ApplicationPaymentStatus.CANCELLED);
                application.setMerchantPaymentId(null);
            }
        }

        application.setStatus(ApplicationStatus.CANCELLED);
        Application cancelled = applicationRepository.save(application);
        notificationService.createNotification(
                application.getVendor(),
                "Application cancelled",
                application.getPaymentStatus() == ApplicationPaymentStatus.REFUND_PENDING
                        ? "Your approved application for '" + application.getEvent().getTitle()
                            + "' was cancelled. A refund has been requested and the organiser must process it through PayFast."
                        : "Your application for '" + application.getEvent().getTitle() + "' was cancelled.",
                "APPLICATION_CANCELLED",
                cancelled.getId());
        boolean refundPending = application.getPaymentStatus() == ApplicationPaymentStatus.REFUND_PENDING;
        notificationService.createNotification(
                application.getEvent().getOrganizer(),
                refundPending ? "Stall fee refund required" : "Vendor cancelled application",
                refundPending
                        ? application.getBusinessName() + " cancelled their approved application for '"
                            + application.getEvent().getTitle() + "'. Process the R"
                            + application.getPaymentAmount() + " refund in PayFast, then mark it processed."
                        : application.getBusinessName() + " cancelled their application for '"
                            + application.getEvent().getTitle() + "'. The stall has been released.",
                refundPending ? "APPLICATION_REFUND_REQUESTED" : "APPLICATION_CANCELLED",
                cancelled.getId());
    }

    @Transactional
    public ApplicationResponse markRefundProcessed(Long applicationId, Long organizerId) {
        Application application = applicationRepository.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", applicationId));
        if (!application.getEvent().getOrganizer().getId().equals(organizerId)) {
            throw new UnauthorizedAccessException("update refund for", "application");
        }
        if (application.getStatus() != ApplicationStatus.CANCELLED
                || application.getPaymentStatus() != ApplicationPaymentStatus.REFUND_PENDING) {
            throw new IllegalStateException("This application does not have a pending refund");
        }
        application.setPaymentStatus(ApplicationPaymentStatus.REFUNDED);
        Application updated = applicationRepository.save(application);
        notificationService.createNotification(application.getVendor(),
                "Stall fee refunded",
                "The organiser marked your refund for '" + application.getEvent().getTitle()
                        + "' as processed in PayFast.",
                "APPLICATION_REFUND_COMPLETED", updated.getId());
        return Helper.toApplicationResponse(updated);
    }
}
