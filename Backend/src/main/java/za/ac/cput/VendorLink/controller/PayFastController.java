package za.ac.cput.VendorLink.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.util.StreamUtils;
import za.ac.cput.VendorLink.dto.request.SubscriptionRequest;
import za.ac.cput.VendorLink.dto.response.PayFastRedirectResponse;
import za.ac.cput.VendorLink.dto.response.SubscriptionResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.PayFastSubscriptionService;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/payfast")
@RequiredArgsConstructor
public class PayFastController {
    private static final Logger log = LoggerFactory.getLogger(PayFastController.class);
    private final PayFastSubscriptionService service;

    @PostMapping("/subscriptions")
    public PayFastRedirectResponse startSubscription(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody SubscriptionRequest request) {
        requirePrincipal(principal);
        LinkedHashMap<String, String> fields = service.begin(
                principal.getUserId(), request.plan(), request.billingCycle());
        return new PayFastRedirectResponse(service.processUrl(), fields,
                fields.get("m_payment_id"), service.isSimulatorEnabled());
    }

    @GetMapping("/subscriptions/{merchantPaymentId}")
    public SubscriptionResponse subscriptionStatus(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String merchantPaymentId) {
        requirePrincipal(principal);
        return service.status(principal.getUserId(), merchantPaymentId);
    }

    @GetMapping("/subscriptions/active")
    public SubscriptionResponse activeSubscription(@AuthenticationPrincipal CustomUserDetails principal) {
        requirePrincipal(principal);
        return service.active(principal.getUserId());
    }

    @PostMapping(path = "/itn", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> itn(HttpServletRequest request) {
        try {
            String raw = StreamUtils.copyToString(request.getInputStream(), StandardCharsets.UTF_8);
            service.handleNotification(parseOrdered(raw), request.getRemoteAddr());
            return ResponseEntity.ok().build();
        } catch (IOException e) {
            log.warn("Could not read PayFast ITN body: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("PayFast ITN handling failed unexpectedly", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private static void requirePrincipal(CustomUserDetails principal) {
        if (principal == null) throw new AccessDeniedException("You must be signed in to manage subscriptions");
    }

    private static LinkedHashMap<String, String> parseOrdered(String raw) {
        LinkedHashMap<String, String> result = new LinkedHashMap<>();
        if (raw == null || raw.isBlank()) return result;
        for (String pair : raw.split("&")) {
            int equals = pair.indexOf('=');
            if (equals < 0) continue;
            result.put(URLDecoder.decode(pair.substring(0, equals), StandardCharsets.UTF_8),
                    URLDecoder.decode(pair.substring(equals + 1), StandardCharsets.UTF_8));
        }
        return result;
    }
}
