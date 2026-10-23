package za.ac.cput.VendorLink.dto.request;

public record PaymentCallbackRequest(String returnUrl, String cancelUrl) {}
