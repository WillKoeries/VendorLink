package za.ac.cput.VendorLink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicVendorResponse {
    private Long id;
    private String businessName;
    private String description;
    private String category;
    private String website;
    private String city;
    private String province;
    private String profileImageUrl;
}
