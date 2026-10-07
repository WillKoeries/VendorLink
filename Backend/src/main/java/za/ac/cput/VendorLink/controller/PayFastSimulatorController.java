package za.ac.cput.VendorLink.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.ac.cput.VendorLink.domain.Subscription;
import za.ac.cput.VendorLink.repository.SubscriptionRepository;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.PayFastSubscriptionService;

import java.util.Map;

@RestController
@RequestMapping("/api/dev/payfast")
@Profile("!prod")
@ConditionalOnProperty(name = "app.payfast.simulator.enabled", havingValue = "true")
@RequiredArgsConstructor
public class PayFastSimulatorController {
    private final PayFastSubscriptionService service;
    private final SubscriptionRepository subscriptionRepository;

    @PostMapping("/complete/{merchantPaymentId}")
    public Map<String, String> complete(@PathVariable String merchantPaymentId,
                                        @AuthenticationPrincipal CustomUserDetails principal) {
        if (principal == null) throw new AccessDeniedException("You must be signed in");
        Subscription subscription = subscriptionRepository.findByMerchantPaymentId(merchantPaymentId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription payment was not found"));
        if (!subscription.getUser().getId().equals(principal.getUserId())) {
            throw new AccessDeniedException("That subscription payment is not yours");
        }
        service.complete(merchantPaymentId, "SIMULATED-" + merchantPaymentId);
        return Map.of("status", "completed", "merchantPaymentId", merchantPaymentId);
    }
}
