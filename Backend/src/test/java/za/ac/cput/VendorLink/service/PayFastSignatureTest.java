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
}
