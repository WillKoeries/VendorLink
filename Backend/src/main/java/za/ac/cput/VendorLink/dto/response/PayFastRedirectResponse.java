package za.ac.cput.VendorLink.dto.response;

import java.util.LinkedHashMap;

public record PayFastRedirectResponse(
        String processUrl,
        LinkedHashMap<String, String> fields,
        String merchantPaymentId,
        boolean simulatorEnabled
) {}
