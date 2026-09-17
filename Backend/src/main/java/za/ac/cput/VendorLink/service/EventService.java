package za.ac.cput.VendorLink.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.ac.cput.VendorLink.domain.*;
import za.ac.cput.VendorLink.dto.request.EventRequest;
import za.ac.cput.VendorLink.dto.response.ApplicationResponse;
import za.ac.cput.VendorLink.dto.response.DashboardStatsResponse;
import za.ac.cput.VendorLink.dto.response.EventResponse;
import za.ac.cput.VendorLink.repository.ApplicationRepository;
import za.ac.cput.VendorLink.repository.CategoryRepository;
import za.ac.cput.VendorLink.repository.EventRepository;
import za.ac.cput.VendorLink.repository.UserRepository;
import za.ac.cput.VendorLink.util.Helper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;

    @Transactional
    public EventResponse createEvent(Long organizerId, EventRequest request) {
        User organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new IllegalArgumentException("Organizer user not found with ID: " + organizerId));

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Category not found with ID: " + request.getCategoryId()));
        }

        int totalStalls = request.getTotalStalls();
        int availableStalls = request.getAvailableStalls() != null ? request.getAvailableStalls() : totalStalls;

        Event event = Event.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .category(category)
                .organizer(organizer)
                .date(request.getDate())
                .endDate(request.getEndDate())
                .time(request.getTime())
                .location(request.getLocation().trim())
                .city(request.getCity().trim())
                .province(request.getProvince())
                .stallFee(request.getStallFee())
                .totalStalls(totalStalls)
                .availableStalls(availableStalls)
                .expectedVisitors(request.getExpectedVisitors())
                .requirements(request.getRequirements())
                .bannerImageUrl(request.getBannerImageUrl())
                .status(request.getStatus() != null ? request.getStatus() : EventStatus.OPEN)
                .build();

        Event saved = eventRepository.save(event);
        return Helper.toEventResponse(saved);
    }

    @Transactional
    public EventResponse updateEvent(Long eventId, Long organizerId, EventRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with ID: " + eventId));

        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new IllegalArgumentException("You are not authorized to update this event");
        }

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Category not found with ID: " + request.getCategoryId()));
            event.setCategory(category);
        }

        event.setTitle(request.getTitle().trim());
        event.setDescription(request.getDescription());
        event.setDate(request.getDate());
        event.setEndDate(request.getEndDate());
        event.setTime(request.getTime());
        event.setLocation(request.getLocation().trim());
        event.setCity(request.getCity().trim());
        event.setProvince(request.getProvince());
        event.setStallFee(request.getStallFee());
        event.setTotalStalls(request.getTotalStalls());
        if (request.getAvailableStalls() != null) {
            event.setAvailableStalls(request.getAvailableStalls());
        }
        event.setExpectedVisitors(request.getExpectedVisitors());
        event.setRequirements(request.getRequirements());
        event.setBannerImageUrl(request.getBannerImageUrl());
        if (request.getStatus() != null) {
            event.setStatus(request.getStatus());
        }

        Event updated = eventRepository.save(event);
        return Helper.toEventResponse(updated);
    }

    @Transactional
    public void deleteEvent(Long eventId, Long organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with ID: " + eventId));

        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new IllegalArgumentException("You are not authorized to delete this event");
        }

        event.setStatus(EventStatus.CANCELLED);
        eventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public EventResponse getEventById(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with ID: " + id));
        return Helper.toEventResponse(event);
    }

    @Transactional(readOnly = true)
    public List<EventResponse> searchEvents(
            EventStatus status,
            Long categoryId,
            String province,
            String city,
            LocalDate date,
            String search) {
        String cleanProvince = (province != null && !province.isBlank()) ? province.trim() : null;
        String cleanCity = (city != null && !city.isBlank()) ? city.trim() : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        return eventRepository.searchEvents(status, categoryId, cleanProvince, cleanCity, date, cleanSearch)
                .stream()
                .map(Helper::toEventResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EventResponse> getOrganizerEvents(Long organizerId) {
        return eventRepository.findByOrganizerIdOrderByDateAsc(organizerId)
                .stream()
                .map(Helper::toEventResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getOrganizerDashboardStats(Long organizerId) {
        long totalEvents = eventRepository.countByOrganizerId(organizerId);
        long totalApplications = applicationRepository.countByEvent_Organizer_Id(organizerId);
        long approvedVendors = applicationRepository.countByEvent_Organizer_IdAndStatus(organizerId,
                ApplicationStatus.APPROVED);

        List<Application> approvedApps = applicationRepository.findByEvent_Organizer_IdAndStatus(organizerId,
                ApplicationStatus.APPROVED);
        BigDecimal totalRevenue = approvedApps.stream()
                .map(a -> a.getEvent().getStallFee())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ApplicationResponse> recentApplications = applicationRepository
                .findTop5ByEvent_Organizer_IdOrderByAppliedAtDesc(organizerId)
                .stream()
                .map(Helper::toApplicationResponse)
                .collect(Collectors.toList());

        List<EventResponse> upcomingEvents = eventRepository.findByOrganizerIdOrderByDateAsc(organizerId)
                .stream()
                .filter(e -> e.getStatus() == EventStatus.OPEN || e.getStatus() == EventStatus.DRAFT)
                .map(Helper::toEventResponse)
                .collect(Collectors.toList());

        return DashboardStatsResponse.builder()
                .totalEvents(totalEvents)
                .totalApplications(totalApplications)
                .approvedVendors(approvedVendors)
                .totalRevenue(totalRevenue)
                .upcomingEvents(upcomingEvents)
                .recentApplications(recentApplications)
                .build();
    }
}
