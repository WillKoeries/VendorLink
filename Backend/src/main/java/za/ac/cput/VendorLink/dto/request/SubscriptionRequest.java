package za.ac.cput.VendorLink.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SubscriptionRequest(
        @NotBlank String plan,
        @NotBlank String billingCycle
) {}
