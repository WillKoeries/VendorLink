package za.ac.cput.VendorLink.util;

import za.ac.cput.VendorLink.domain.*;
import za.ac.cput.VendorLink.dto.response.*;

public class Helper {

    public static UserResponse toUserResponse(User user) {
        if (user == null) return null;
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }

    public static CategoryResponse toCategoryResponse(Category category) {
        if (category == null) return null;
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .iconUrl(category.getIconUrl())
                .build();
    }

    public static EventResponse toEventResponse(Event event) {
        if (event == null) return null;
        return EventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .categoryId(event.getCategory() != null ? event.getCategory().getId() : null)
                .categoryName(event.getCategory() != null ? event.getCategory().getName() : null)
                .organizerId(event.getOrganizer() != null ? event.getOrganizer().getId() : null)
                .organizerName(event.getOrganizer() != null ? event.getOrganizer().getFullName() : null)
                .organizerEmail(event.getOrganizer() != null ? event.getOrganizer().getEmail() : null)
                .date(event.getDate())
                .endDate(event.getEndDate())
                .time(event.getTime())
                .location(event.getLocation())
                .city(event.getCity())
                .province(event.getProvince())
                .stallFee(event.getStallFee())
                .totalStalls(event.getTotalStalls())
                .availableStalls(event.getAvailableStalls())
                .expectedVisitors(event.getExpectedVisitors())
                .requirements(event.getRequirements())
                .bannerImageUrl(event.getBannerImageUrl())
                .status(event.getStatus())
                .createdAt(event.getCreatedAt())
                .build();
    }

    public static ApplicationResponse toApplicationResponse(Application app) {
        if (app == null) return null;
        Event event = app.getEvent();
        User vendor = app.getVendor();

        return ApplicationResponse.builder()
                .id(app.getId())
                .eventId(event != null ? event.getId() : null)
                .eventTitle(event != null ? event.getTitle() : null)
                .eventDate(event != null ? event.getDate() : null)
                .eventLocation(event != null ? event.getLocation() : null)
                .stallFee(event != null ? event.getStallFee() : null)
                .vendorId(vendor != null ? vendor.getId() : null)
                .vendorName(vendor != null ? vendor.getFullName() : null)
                .vendorEmail(vendor != null ? vendor.getEmail() : null)
                .businessName(app.getBusinessName())
                .productsDescription(app.getProductsDescription())
                .specialRequirements(app.getSpecialRequirements())
                .status(app.getStatus())
                .reviewNotes(app.getReviewNotes())
                .appliedAt(app.getAppliedAt())
                .reviewedAt(app.getReviewedAt())
                .build();
    }

    public static VendorProfileResponse toVendorProfileResponse(VendorProfile profile) {
        if (profile == null) return null;
        User user = profile.getUser();

        return VendorProfileResponse.builder()
                .id(profile.getId())
                .userId(user != null ? user.getId() : null)
                .fullName(user != null ? user.getFullName() : null)
                .email(user != null ? user.getEmail() : null)
                .businessName(profile.getBusinessName())
                .description(profile.getDescription())
                .category(profile.getCategory())
                .phone(profile.getPhone())
                .website(profile.getWebsite())
                .city(profile.getCity())
                .province(profile.getProvince())
                .address(profile.getAddress())
                .profileImageUrl(profile.getProfileImageUrl())
                .build();
    }

    public static NotificationResponse toNotificationResponse(Notification notification) {
        if (notification == null) return null;
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .referenceId(notification.getReferenceId())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
