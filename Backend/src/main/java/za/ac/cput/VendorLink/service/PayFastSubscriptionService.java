package za.ac.cput.VendorLink.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.ac.cput.VendorLink.domain.*;
import za.ac.cput.VendorLink.dto.response.SubscriptionResponse;
import za.ac.cput.VendorLink.dto.response.PayFastRedirectResponse;
import za.ac.cput.VendorLink.repository.ApplicationRepository;
import za.ac.cput.VendorLink.factory.PaymentGateway;
import za.ac.cput.VendorLink.factory.PaymentProvider;
import za.ac.cput.VendorLink.repository.SubscriptionRepository;
import za.ac.cput.VendorLink.repository.UserRepository;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PayFastSubscriptionService implements PaymentGateway {
    private static final Logger log = LoggerFactory.getLogger(PayFastSubscriptionService.class);
    private static final BigDecimal TOLERANCE = new BigDecimal("0.01");
    private static final Duration TIMEOUT = Duration.ofSeconds(15);
    private static final List<String> PAYFAST_HOSTS = List.of(
            "www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za");

    private final SubscriptionRepository subscriptionRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();

    @Value("${app.payfast.sandbox:false}")
    private boolean sandbox;
    @Value("${app.payfast.merchant-id:}")
    private String merchantId;
    @Value("${app.payfast.merchant-key:}")
    private String merchantKey;
    @Value("${app.payfast.passphrase:}")
    private String passphrase;
    @Value("${app.payfast.return-url:https://vendorlink-1vla.onrender.com/payment-status.html?payment=complete}")
    private String returnUrl;
    @Value("${app.payfast.cancel-url:https://vendorlink-1vla.onrender.com/payment-status.html?payment=cancelled}")
    private String cancelUrl;
    @Value("${app.payfast.notify-url:https://vendorlink-1vla.onrender.com/api/payfast/itn}")
    private String notifyUrl;
    @Value("${app.payfast.validate-source-ip:false}")
    private boolean validateSourceIp;
    @Value("${app.payfast.simulator.enabled:false}")
    private boolean simulatorEnabled;

    public boolean isSimulatorEnabled() {
        return simulatorEnabled;
    }

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.PAYFAST;
    }

    public boolean isSandbox() {
        return sandbox;
    }

    public String processUrl() {
        return baseUrl() + "/eng/process";
    }

    public String topUpMode() {
        return simulatorEnabled ? "SIMULATED" : sandbox ? "SANDBOX" : "LIVE";
    }

    public LinkedHashMap<String, String> begin(Long userId, String requestedPlan, String requestedCycle) {
        return begin(userId, requestedPlan, requestedCycle, null, null);
    }

    @Override
    public LinkedHashMap<String, String> begin(Long userId, String requestedPlan, String requestedCycle,
                                               String clientReturnUrl, String clientCancelUrl) {
        requireConfigured();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User account was not found"));
        String plan = normalizePlan(requestedPlan);
        String cycle = normalizeCycle(requestedCycle);
        if (!isPlanAllowed(user.getRole(), plan)) {
            throw new IllegalArgumentException("That plan is not available for your account role");
        }
        BigDecimal amount = price(plan, cycle);

        Subscription subscription = subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).billingCycle(cycle).amount(amount)
                .merchantPaymentId(UUID.randomUUID().toString()).status(SubscriptionStatus.PENDING).build());

        String[] name = splitName(user.getFullName());
        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        fields.put("merchant_id", merchantId);
        fields.put("merchant_key", merchantKey);

        String effectiveReturnUrl = isAllowedCallbackUrl(clientReturnUrl, returnUrl) ? clientReturnUrl : returnUrl;
        String effectiveCancelUrl = isAllowedCallbackUrl(clientCancelUrl, cancelUrl) ? clientCancelUrl : cancelUrl;

        fields.put("return_url", appendParam(effectiveReturnUrl, "payment_id", subscription.getMerchantPaymentId()));
        fields.put("cancel_url", appendParam(effectiveCancelUrl, "payment_id", subscription.getMerchantPaymentId()));
        fields.put("notify_url", notifyUrl);
        fields.put("name_first", name[0]);
        fields.put("name_last", name[1]);
        fields.put("email_address", user.getEmail());
        fields.put("m_payment_id", subscription.getMerchantPaymentId());
        fields.put("amount", amount.toPlainString());
        fields.put("item_name", "VendorLink " + plan + " " + cycle + " subscription");
        fields.put("signature", PayFastSignature.sign(fields, passphrase));
        return fields;
    }

    @Transactional
    public PayFastRedirectResponse beginApplicationPayment(Long userId, Long applicationId,
                                                           String clientReturnUrl, String clientCancelUrl) {
        requireConfigured();
        Application application = applicationRepository.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application was not found"));
        if (!application.getVendor().getId().equals(userId)) {
            throw new IllegalArgumentException("That application does not belong to you");
        }
        if (application.getStatus() != ApplicationStatus.APPROVED) {
            throw new IllegalStateException("You can pay after the organiser approves your application");
        }
        if (application.getPaymentStatus() == ApplicationPaymentStatus.PAID) {
            throw new IllegalStateException("This stall fee has already been paid");
        }
        if (application.getEvent().getStatus() == EventStatus.CANCELLED
                || application.getEvent().getStatus() == EventStatus.COMPLETED) {
            throw new IllegalStateException("This event is no longer accepting stall payments");
        }

        BigDecimal amount = application.getPaymentAmount() != null
                ? application.getPaymentAmount() : application.getEvent().getStallFee();
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalStateException("No payment is due for this application");
        }
        if (!sandbox && amount.compareTo(new BigDecimal("5.00")) < 0) {
            throw new IllegalStateException("PayFast payments must be at least R5.00. Ask the organiser to update the stall fee.");
        }

        if (application.getPaymentStatus() != ApplicationPaymentStatus.PENDING
                || application.getMerchantPaymentId() == null) {
            application.setMerchantPaymentId("APP-" + UUID.randomUUID());
        }
        application.setPaymentStatus(ApplicationPaymentStatus.PENDING);
        application.setPaymentAmount(amount);
        applicationRepository.save(application);

        String[] name = splitName(application.getVendor().getFullName());
        String effectiveReturnUrl = isAllowedCallbackUrl(clientReturnUrl, returnUrl) ? clientReturnUrl : returnUrl;
        String effectiveCancelUrl = isAllowedCallbackUrl(clientCancelUrl, cancelUrl) ? clientCancelUrl : cancelUrl;
        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        fields.put("merchant_id", merchantId);
        fields.put("merchant_key", merchantKey);
        fields.put("return_url", appendParam(effectiveReturnUrl, "payment_id", application.getMerchantPaymentId()));
        fields.put("cancel_url", appendParam(effectiveCancelUrl, "payment_id", application.getMerchantPaymentId()));
        fields.put("notify_url", notifyUrl);
        fields.put("name_first", name[0]);
        fields.put("name_last", name[1]);
        fields.put("email_address", application.getVendor().getEmail());
        fields.put("m_payment_id", application.getMerchantPaymentId());
        fields.put("amount", amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString());
        String itemName = "VendorLink stall fee - " + application.getEvent().getTitle();
        fields.put("item_name", itemName.substring(0, Math.min(itemName.length(), 100)));
        fields.put("signature", PayFastSignature.sign(fields, passphrase));
        return new PayFastRedirectResponse(processUrl(), fields, application.getMerchantPaymentId(), simulatorEnabled);
    }

    static boolean isAllowedCallbackUrl(String candidate, String configuredUrl) {
        if (candidate == null || configuredUrl == null || candidate.isBlank() || configuredUrl.isBlank()) return false;
        try {
            URI requested = URI.create(candidate);
            URI configured = URI.create(configuredUrl);
            return ("http".equalsIgnoreCase(requested.getScheme()) || "https".equalsIgnoreCase(requested.getScheme()))
                    && requested.getUserInfo() == null
                    && requested.getHost() != null
                    && requested.getHost().equalsIgnoreCase(configured.getHost())
                    && requested.getPort() == configured.getPort()
                    && requested.getScheme().equalsIgnoreCase(configured.getScheme());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static String appendParam(String url, String key, String value) {
        if (url == null || url.isBlank()) return url;
        int fragmentStart = url.indexOf('#');
        String base = fragmentStart < 0 ? url : url.substring(0, fragmentStart);
        String fragment = fragmentStart < 0 ? "" : url.substring(fragmentStart);
        String separator = base.contains("?") ? "&" : "?";
        return base + separator + key + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8) + fragment;
    }

    @Override
    @Transactional
    public void handleNotification(LinkedHashMap<String, String> posted, String sourceIp) {
        if (merchantId == null || merchantId.isBlank() || merchantKey == null || merchantKey.isBlank()) {
            log.error("Ignoring PayFast ITN because PayFast credentials are not configured");
            return;
        }
        String paymentId = posted.get("m_payment_id");
        if (paymentId == null) {
            log.warn("PayFast ITN without m_payment_id");
            return;
        }
        String providedSignature = posted.get("signature");
        if (!PayFastSignature.matches(
                PayFastSignature.signNotification(posted, passphrase),
                providedSignature == null ? null : providedSignature.toLowerCase(Locale.ROOT))) {
            log.warn("PayFast ITN for {} failed signature validation", paymentId);
            return;
        }
        if (validateSourceIp && !isFromPayFast(sourceIp)) {
            log.warn("PayFast ITN for {} came from unexpected address {}", paymentId, sourceIp);
            return;
        }
        if (paymentId.startsWith("APP-")) {
            handleApplicationPaymentNotification(posted, paymentId);
            return;
        }
        Subscription subscription = subscriptionRepository.findByMerchantPaymentId(paymentId).orElse(null);
        if (subscription == null) {
            log.warn("PayFast ITN for unknown payment {}", paymentId);
            return;
        }
        BigDecimal gross = parseAmount(posted.get("amount_gross"));
        if (gross == null || subscription.getAmount().subtract(gross).abs().compareTo(TOLERANCE) > 0
                || !merchantId.equals(posted.get("merchant_id"))) {
            log.warn("PayFast ITN for {} failed merchant or amount validation", paymentId);
            return;
        }
        if (!"COMPLETE".equals(posted.get("payment_status"))) return;
        if (!confirmWithPayFast(posted)) {
            log.warn("PayFast did not confirm ITN for {}", paymentId);
            return;
        }
        complete(paymentId, posted.get("pf_payment_id"));
    }

    private void handleApplicationPaymentNotification(LinkedHashMap<String, String> posted, String paymentId) {
        Application application = applicationRepository.findByMerchantPaymentIdForUpdate(paymentId).orElse(null);
        if (application == null) {
            log.warn("PayFast ITN for unknown application payment {}", paymentId);
            return;
        }
        BigDecimal gross = parseAmount(posted.get("amount_gross"));
        if (gross == null || application.getPaymentAmount() == null
                || application.getPaymentAmount().subtract(gross).abs().compareTo(TOLERANCE) > 0
                || !merchantId.equals(posted.get("merchant_id"))) {
            log.warn("PayFast ITN for application payment {} failed merchant or amount validation", paymentId);
            return;
        }
        String paymentStatus = posted.get("payment_status");
        if ("CANCELLED".equals(paymentStatus)) {
            if (application.getPaymentStatus() == ApplicationPaymentStatus.PENDING) {
                application.setPaymentStatus(ApplicationPaymentStatus.UNPAID);
                application.setMerchantPaymentId(null);
                applicationRepository.save(application);
            }
            return;
        }
        if (!"COMPLETE".equals(paymentStatus) || !confirmWithPayFast(posted)) {
            log.warn("PayFast did not confirm application payment {}", paymentId);
            return;
        }
        if (application.getStatus() != ApplicationStatus.APPROVED) {
            log.warn("Ignoring payment {} because its application is no longer approved", paymentId);
            return;
        }
        if (application.getPaymentStatus() == ApplicationPaymentStatus.PENDING) {
            application.setPaymentStatus(ApplicationPaymentStatus.PAID);
            application.setPfPaymentId(posted.get("pf_payment_id"));
            application.setPaymentCompletedAt(LocalDateTime.now());
            Application paid = applicationRepository.save(application);
            notificationService.createNotification(application.getEvent().getOrganizer(),
                    "Vendor stall fee paid",
                    application.getBusinessName() + " paid the stall fee for " + application.getEvent().getTitle() + ".",
                    "APPLICATION_PAYMENT_COMPLETED", paid.getId());
        }
    }

    @Transactional
    public void complete(String merchantPaymentId, String pfPaymentId) {
        Subscription pending = subscriptionRepository.findByMerchantPaymentId(merchantPaymentId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription payment was not found"));
        Long userId = pending.getUser().getId();
        int updated = subscriptionRepository.compareAndSetStatus(
                merchantPaymentId, SubscriptionStatus.PENDING, SubscriptionStatus.COMPLETED,
                pfPaymentId, LocalDateTime.now());
        if (updated != 1) return;
        subscriptionRepository.cancelPrevious(
                userId, merchantPaymentId,
                SubscriptionStatus.COMPLETED, SubscriptionStatus.CANCELLED);
        log.info("Activated VendorLink {} subscription for user {}", pending.getPlan(), userId);
    }

    @Transactional(readOnly = true)
    @Override
    public SubscriptionResponse status(Long userId, String merchantPaymentId) {
        Subscription subscription = subscriptionRepository.findByMerchantPaymentId(merchantPaymentId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription payment was not found"));
        if (!subscription.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("That subscription payment does not belong to you");
        }
        return toResponse(subscription);
    }

    @Transactional(readOnly = true)
    @Override
    public SubscriptionResponse active(Long userId) {
        return subscriptionRepository.findFirstByUserIdAndStatusOrderByCompletedAtDesc(
                        userId, SubscriptionStatus.COMPLETED)
                .map(PayFastSubscriptionService::toResponse).orElse(null);
    }

    @Transactional
    @Override
    public SubscriptionResponse cancelPending(Long userId, String merchantPaymentId) {
        Subscription subscription = subscriptionRepository.findByMerchantPaymentId(merchantPaymentId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription payment was not found"));
        if (!subscription.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("That subscription payment does not belong to you");
        }
        if (subscription.getStatus() == SubscriptionStatus.PENDING) {
            subscription.setStatus(SubscriptionStatus.CANCELLED);
            subscription = subscriptionRepository.save(subscription);
            log.info("Subscription payment {} cancelled by user {}", merchantPaymentId, userId);
        }
        return toResponse(subscription);
    }

    @Transactional
    @Override
    public SubscriptionResponse confirmSandbox(Long userId, String merchantPaymentId) {
        if (!simulatorEnabled) {
            throw new IllegalStateException("Direct payment confirmation is only available when the local simulator is enabled");
        }
        Subscription subscription = subscriptionRepository.findByMerchantPaymentId(merchantPaymentId)
                .orElseThrow(() -> new IllegalArgumentException("Subscription payment was not found"));
        if (!subscription.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("That subscription payment does not belong to you");
        }
        if (subscription.getStatus() == SubscriptionStatus.PENDING) {
            complete(merchantPaymentId, "SANDBOX-" + merchantPaymentId);
        }
        return status(userId, merchantPaymentId);
    }

    public static BigDecimal price(String plan, String cycle) {
        return switch (plan + ":" + cycle) {
            case "PROFESSIONAL_VENDOR:MONTHLY" -> new BigDecimal("99.00");
            case "PROFESSIONAL_VENDOR:ANNUAL" -> new BigDecimal("948.00");
            case "COMMERCIAL_BRAND:MONTHLY" -> new BigDecimal("199.00");
            case "COMMERCIAL_BRAND:ANNUAL" -> new BigDecimal("1908.00");
            case "MARKET_OPERATOR:MONTHLY" -> new BigDecimal("499.00");
            case "MARKET_OPERATOR:ANNUAL" -> new BigDecimal("4788.00");
            default -> throw new IllegalArgumentException("That paid plan or billing cycle is not available");
        };
    }

    private static String normalizePlan(String plan) {
        return plan == null ? "" : plan.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeCycle(String cycle) {
        String normalized = cycle == null ? "" : cycle.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("MONTHLY") && !normalized.equals("ANNUAL")) {
            throw new IllegalArgumentException("Billing cycle must be MONTHLY or ANNUAL");
        }
        return normalized;
    }

    private static boolean isPlanAllowed(Role role, String plan) {
        return role == Role.VENDOR && Set.of("PROFESSIONAL_VENDOR", "COMMERCIAL_BRAND").contains(plan)
                || (role == Role.ORGANIZER || role == Role.ADMIN) && plan.equals("MARKET_OPERATOR");
    }

    private String baseUrl() {
        return sandbox ? "https://sandbox.payfast.co.za" : "https://www.payfast.co.za";
    }

    private boolean confirmWithPayFast(LinkedHashMap<String, String> posted) {
        StringBuilder body = new StringBuilder();
        posted.forEach((key, value) -> {
            if (!body.isEmpty()) body.append('&');
            body.append(key).append('=').append(PayFastSignature.phpUrlEncode(value == null ? "" : value));
        });
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl() + "/eng/query/validate")).timeout(TIMEOUT)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8)).build();
            String response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
            return response != null && response.strip().lines().findFirst()
                    .map(line -> "VALID".equalsIgnoreCase(line.strip())).orElse(false);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.warn("Could not confirm PayFast ITN: {}", e.getMessage());
            return false;
        }
    }

    private boolean isFromPayFast(String sourceIp) {
        if (sourceIp == null) return false;
        Set<String> allowed = new HashSet<>();
        for (String host : PAYFAST_HOSTS) {
            try {
                for (InetAddress address : InetAddress.getAllByName(host)) allowed.add(address.getHostAddress());
            } catch (UnknownHostException e) {
                log.warn("Could not resolve PayFast host {}", host);
            }
        }
        return allowed.contains(sourceIp);
    }

    private static BigDecimal parseAmount(String raw) {
        try {
            return raw == null ? null : new BigDecimal(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String[] splitName(String fullName) {
        String clean = fullName == null ? "VendorLink customer" : fullName.trim();
        int space = clean.indexOf(' ');
        return space < 0 ? new String[]{clean, ""} : new String[]{clean.substring(0, space), clean.substring(space + 1)};
    }

    private void requireConfigured() {
        if (merchantId == null || merchantId.isBlank() || merchantKey == null || merchantKey.isBlank()) {
            throw new IllegalStateException("PayFast is not configured. Set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY.");
        }
    }

    private static SubscriptionResponse toResponse(Subscription subscription) {
        return new SubscriptionResponse(subscription.getMerchantPaymentId(), subscription.getPlan(),
                subscription.getBillingCycle(), subscription.getAmount(), subscription.getStatus(),
                subscription.getCreatedAt(), subscription.getCompletedAt());
    }
}
