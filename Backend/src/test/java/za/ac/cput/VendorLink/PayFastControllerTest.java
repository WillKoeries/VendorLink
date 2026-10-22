package za.ac.cput.VendorLink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import za.ac.cput.VendorLink.domain.SubscriptionStatus;
import za.ac.cput.VendorLink.dto.request.SubscriptionRequest;
import za.ac.cput.VendorLink.dto.response.SubscriptionResponse;
import za.ac.cput.VendorLink.factory.PaymentGatewayFactory;
import za.ac.cput.VendorLink.factory.PaymentProvider;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.PayFastSubscriptionService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class PayFastControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PayFastSubscriptionService service;

    @MockBean
    private PaymentGatewayFactory gatewayFactory;

    private final CustomUserDetails vendorUser = new CustomUserDetails(
            1L, "vendor@vendorlink.co.za", "Password123!", "VENDOR"
    );

    @BeforeEach
    void configureGateway() {
        when(gatewayFactory.get(PaymentProvider.PAYFAST)).thenReturn(service);
    }

    @Test
    @DisplayName("Should initiate PayFast subscription with custom return and cancel URLs")
    void shouldInitiateSubscription() throws Exception {
        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        fields.put("m_payment_id", "test-pay-123");
        fields.put("return_url", "http://localhost:8080/payment-status.html?payment=complete&payment_id=test-pay-123");

        when(service.begin(eq(1L), eq("PROFESSIONAL_VENDOR"), eq("MONTHLY"), anyString(), anyString()))
                .thenReturn(fields);
        when(service.processUrl()).thenReturn("https://sandbox.payfast.co.za/eng/process");
        when(service.isSimulatorEnabled()).thenReturn(false);

        SubscriptionRequest request = new SubscriptionRequest(
                "PROFESSIONAL_VENDOR",
                "MONTHLY",
                "http://localhost:8080/payment-status.html?payment=complete",
                "http://localhost:8080/payment-status.html?payment=cancelled"
        );

        mockMvc.perform(post("/api/payfast/subscriptions")
                        .with(user(vendorUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.merchantPaymentId").value("test-pay-123"))
                .andExpect(jsonPath("$.processUrl").value("https://sandbox.payfast.co.za/eng/process"));
    }

    @Test
    @DisplayName("Should cancel pending subscription")
    void shouldCancelPendingSubscription() throws Exception {
        SubscriptionResponse response = new SubscriptionResponse(
                "test-pay-123", "PROFESSIONAL_VENDOR", "MONTHLY",
                new BigDecimal("99.00"), SubscriptionStatus.CANCELLED,
                LocalDateTime.now(), null
        );

        when(service.cancelPending(1L, "test-pay-123")).thenReturn(response);

        mockMvc.perform(post("/api/payfast/subscriptions/test-pay-123/cancel")
                        .with(user(vendorUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.merchantPaymentId").value("test-pay-123"))
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    @DisplayName("Should confirm sandbox payment")
    void shouldConfirmSandboxPayment() throws Exception {
        SubscriptionResponse response = new SubscriptionResponse(
                "test-pay-123", "PROFESSIONAL_VENDOR", "MONTHLY",
                new BigDecimal("99.00"), SubscriptionStatus.COMPLETED,
                LocalDateTime.now(), LocalDateTime.now()
        );

        when(service.confirmSandbox(1L, "test-pay-123")).thenReturn(response);

        mockMvc.perform(post("/api/payfast/subscriptions/test-pay-123/confirm-sandbox")
                        .with(user(vendorUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.merchantPaymentId").value("test-pay-123"))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }
}
