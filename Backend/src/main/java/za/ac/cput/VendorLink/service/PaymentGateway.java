package za.ac.cput.VendorLink.service;

import za.ac.cput.VendorLink.dto.response.SubscriptionResponse;

import java.util.LinkedHashMap;

public interface PaymentGateway {
    PaymentProvider provider();

    String processUrl();

    boolean isSimulatorEnabled();

    LinkedHashMap<String, String> begin(Long userId, String plan, String billingCycle,
                                        String returnUrl, String cancelUrl);

    SubscriptionResponse status(Long userId, String merchantPaymentId);

    SubscriptionResponse cancelPending(Long userId, String merchantPaymentId);

    SubscriptionResponse confirmSandbox(Long userId, String merchantPaymentId);

    SubscriptionResponse active(Long userId);

    void handleNotification(LinkedHashMap<String, String> posted, String sourceIp);
}
