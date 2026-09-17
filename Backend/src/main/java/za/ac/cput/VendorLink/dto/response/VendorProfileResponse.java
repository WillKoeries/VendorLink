package za.ac.cput.VendorLink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorProfileResponse {
    private Long id;
    private Long userId;
    private String fullName;
    private String email;
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
