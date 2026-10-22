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
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.*;
import za.ac.cput.VendorLink.dto.request.SubscriptionRequest;
import za.ac.cput.VendorLink.dto.response.PayFastRedirectResponse;
import za.ac.cput.VendorLink.dto.response.SubscriptionResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.PaymentGateway;
import za.ac.cput.VendorLink.service.PaymentGatewayFactory;
import za.ac.cput.VendorLink.service.PaymentProvider;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/payfast")
@RequiredArgsConstructor
public class PayFastController {
    private static final Logger log = LoggerFactory.getLogger(PayFastController.class);
    private final PaymentGatewayFactory gatewayFactory;

    @PostMapping("/subscriptions")
    public PayFastRedirectResponse startSubscription(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody SubscriptionRequest request) {
        requirePrincipal(principal);
        PaymentGateway gateway = gateway();
        LinkedHashMap<String, String> fields = gateway.begin(
                principal.getUserId(), request.plan(), request.billingCycle(),
                request.returnUrl(), request.cancelUrl());
        return new PayFastRedirectResponse(gateway.processUrl(), fields,
                fields.get("m_payment_id"), gateway.isSimulatorEnabled());
    }

    @GetMapping("/subscriptions/{merchantPaymentId}")
    public SubscriptionResponse subscriptionStatus(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String merchantPaymentId) {
        requirePrincipal(principal);
        return gateway().status(principal.getUserId(), merchantPaymentId);
    }

    @PostMapping("/subscriptions/{merchantPaymentId}/cancel")
    public SubscriptionResponse cancelSubscription(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String merchantPaymentId) {
        requirePrincipal(principal);
        return gateway().cancelPending(principal.getUserId(), merchantPaymentId);
    }

    @PostMapping("/subscriptions/{merchantPaymentId}/confirm-sandbox")
    public SubscriptionResponse confirmSandbox(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String merchantPaymentId) {
        requirePrincipal(principal);
        return gateway().confirmSandbox(principal.getUserId(), merchantPaymentId);
    }

    @GetMapping("/subscriptions/active")
    public SubscriptionResponse activeSubscription(@AuthenticationPrincipal CustomUserDetails principal) {
        requirePrincipal(principal);
        return gateway().active(principal.getUserId());
    }

    @PostMapping(path = "/itn", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> itn(HttpServletRequest request) {
        try {
            String raw = StreamUtils.copyToString(request.getInputStream(), StandardCharsets.UTF_8);
            gateway().handleNotification(parseOrdered(raw), request.getRemoteAddr());
            return ResponseEntity.ok().build();
        } catch (IOException e) {
            log.warn("Could not read PayFast ITN body: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("PayFast ITN handling failed unexpectedly", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private PaymentGateway gateway() {
        return gatewayFactory.get(PaymentProvider.PAYFAST);
    }

    private static void requirePrincipal(CustomUserDetails principal) {
        if (principal == null) throw new AccessDeniedException("You must be signed in to manage subscriptions");
    }

    private static LinkedHashMap<String, String> parseOrdered(String raw) {
        LinkedHashMap<String, String> result = new LinkedHashMap<>();
        if (raw == null || raw.isBlank()) return result;
        for (String pair : raw.split("&", -1)) {
            if (pair.isBlank()) continue;
            int equals = pair.indexOf('=');
            if (equals < 0) throw new IllegalArgumentException("Malformed PayFast ITN parameter");
            String key = URLDecoder.decode(pair.substring(0, equals), StandardCharsets.UTF_8);
            if (result.containsKey(key)) throw new IllegalArgumentException("Duplicate PayFast ITN parameter");
            result.put(key, URLDecoder.decode(pair.substring(equals + 1), StandardCharsets.UTF_8));
        }
        return result;
    }

}
