package za.ac.cput.VendorLink.service;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class PaymentGatewayFactory {
    private final Map<PaymentProvider, PaymentGateway> gateways;

    public PaymentGatewayFactory(List<PaymentGateway> gatewayImplementations) {
        EnumMap<PaymentProvider, PaymentGateway> resolved = new EnumMap<>(PaymentProvider.class);
        for (PaymentGateway gateway : gatewayImplementations) {
            PaymentGateway previous = resolved.put(gateway.provider(), gateway);
            if (previous != null) {
                throw new IllegalStateException("Multiple payment gateways configured for " + gateway.provider());
            }
        }
        this.gateways = Map.copyOf(resolved);
    }

    public PaymentGateway get(PaymentProvider provider) {
        PaymentGateway gateway = gateways.get(provider);
        if (gateway == null) {
            throw new IllegalArgumentException("No payment gateway configured for " + provider);
        }
        return gateway;
    }
}
