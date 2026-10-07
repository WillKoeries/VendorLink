package za.ac.cput.VendorLink.dto.response;

import za.ac.cput.VendorLink.domain.SubscriptionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SubscriptionResponse(
        String merchantPaymentId,
        String plan,
        String billingCycle,
        BigDecimal amount,
        SubscriptionStatus status,
        LocalDateTime createdAt,
        LocalDateTime completedAt
) {}
