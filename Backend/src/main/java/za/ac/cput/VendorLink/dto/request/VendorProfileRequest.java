package za.ac.cput.VendorLink.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorProfileRequest {

    @NotBlank(message = "Business name is required")
    private String businessName;

    private String description;

    private String category;

    private String phone;

    private String website;

    private String city;

    private String province;

    private String address;

    private String profileImageUrl;
}
