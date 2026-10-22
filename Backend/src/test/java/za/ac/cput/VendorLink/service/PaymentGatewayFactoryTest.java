package za.ac.cput.VendorLink.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PaymentGatewayFactoryTest {

    @Test
    void resolvesGatewayByProvider() {
        PaymentGateway payFast = mock(PaymentGateway.class);
        when(payFast.provider()).thenReturn(PaymentProvider.PAYFAST);

        PaymentGatewayFactory factory = new PaymentGatewayFactory(List.of(payFast));

        assertThat(factory.get(PaymentProvider.PAYFAST)).isSameAs(payFast);
    }

    @Test
    void rejectsDuplicateProviderImplementations() {
        PaymentGateway first = mock(PaymentGateway.class);
        PaymentGateway second = mock(PaymentGateway.class);
        when(first.provider()).thenReturn(PaymentProvider.PAYFAST);
        when(second.provider()).thenReturn(PaymentProvider.PAYFAST);

        assertThatThrownBy(() -> new PaymentGatewayFactory(List.of(first, second)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Multiple payment gateways");
    }
}
