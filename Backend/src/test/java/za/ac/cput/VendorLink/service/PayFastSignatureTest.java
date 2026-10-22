package za.ac.cput.VendorLink.service;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;

import static org.assertj.core.api.Assertions.assertThat;

class PayFastSignatureTest {

    @Test
    void usesPhpEncodingForAsteriskAndPreservesFieldOrder() {
        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        fields.put("merchant_id", "10054859");
        fields.put("item_name", "Brand * special");

        assertThat(PayFastSignature.phpUrlEncode("Brand * special"))
                .isEqualTo("Brand+%2A+special");
        assertThat(PayFastSignature.sign(fields, "")).hasSize(32);
    }

    @Test
    void keepsAnnualPlanAmountsServerSide() {
        assertThat(PayFastSubscriptionService.price("PROFESSIONAL_VENDOR", "ANNUAL"))
                .hasToString("948.00");
    }

    @Test
    void excludesSignatureRegardlessOfItsPosition() {
        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        fields.put("merchant_id", "10054859");
        fields.put("signature", "ignored");
        fields.put("payment_status", "COMPLETE");

        LinkedHashMap<String, String> expected = new LinkedHashMap<>();
        expected.put("merchant_id", "10054859");
        expected.put("payment_status", "COMPLETE");

        assertThat(PayFastSignature.signNotification(fields, "secret"))
                .isEqualTo(PayFastSignature.signNotification(expected, "secret"));
    }

    @Test
    void onlyAllowsCallbackUrlsOnConfiguredOrigin() {
        assertThat(PayFastSubscriptionService.isAllowedCallbackUrl(
                "https://checkout.example.test/payment-status.html?payment=complete",
                "https://checkout.example.test/payment-status.html?payment=complete")).isTrue();
        assertThat(PayFastSubscriptionService.isAllowedCallbackUrl(
                "https://attacker.example.test/payment-status.html",
                "https://checkout.example.test/payment-status.html")).isFalse();
    }
}
