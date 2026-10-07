package za.ac.cput.VendorLink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import za.ac.cput.VendorLink.dto.request.VendorProfileRequest;
import za.ac.cput.VendorLink.dto.response.VendorProfileResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.VendorService;

import java.util.List;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class VendorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VendorService vendorService;

    private final CustomUserDetails vendorUser = new CustomUserDetails(
            1L, "vendor@vendorlink.co.za", "Password123!", "VENDOR"
    );

    @Test
    @DisplayName("Should get and update current vendor's profile")
    void shouldGetAndUpdateVendorProfile() throws Exception {
        VendorProfileResponse initialProfile = VendorProfileResponse.builder()
                .userId(1L)
                .businessName("Lisa's Coffee Bar")
                .description("Specialty artisanal roasted coffee")
                .category("Food & Beverages")
                .city("Cape Town")
                .province("Western Cape")
                .phone("+27 82 123 4567")
                .build();

        VendorProfileResponse updatedProfile = VendorProfileResponse.builder()
                .userId(1L)
                .businessName("Lisa's Specialty Coffee & Roastery")
                .description("Award-winning Ethiopian and Colombian single-origin roasts.")
                .category("Food & Beverages")
                .city("Cape Town")
                .province("Western Cape")
                .phone("+27 82 123 4567")
                .website("https://lisascoffee.co.za")
                .build();

        when(vendorService.getVendorProfile(1L)).thenReturn(initialProfile);
        when(vendorService.updateVendorProfile(eq(1L), any(VendorProfileRequest.class))).thenReturn(updatedProfile);

        mockMvc.perform(get("/api/vendor/profile")
                        .with(user(vendorUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessName").value("Lisa's Coffee Bar"));

        VendorProfileRequest updateRequest = VendorProfileRequest.builder()
                .businessName("Lisa's Specialty Coffee & Roastery")
                .description("Award-winning Ethiopian and Colombian single-origin roasts.")
                .category("Food & Beverages")
                .city("Cape Town")
                .province("Western Cape")
                .phone("+27 82 123 4567")
                .website("https://lisascoffee.co.za")
                .build();

        mockMvc.perform(put("/api/vendor/profile")
                        .with(user(vendorUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessName").value("Lisa's Specialty Coffee & Roastery"));

        verify(vendorService).getVendorProfile(1L);
        verify(vendorService).updateVendorProfile(eq(1L), any(VendorProfileRequest.class));
    }

    @Test
    @DisplayName("Should retrieve public list of all vendors")
    void shouldGetPublicVendorsList() throws Exception {
        List<VendorProfileResponse> mockVendors = List.of(
                VendorProfileResponse.builder().userId(1L).businessName("Lisa's Coffee Bar").build(),
                VendorProfileResponse.builder().userId(2L).businessName("Ceramic Studio").build(),
                VendorProfileResponse.builder().userId(3L).businessName("Organic Honey Co").build()
        );

        when(vendorService.getAllVendors()).thenReturn(mockVendors);

        mockMvc.perform(get("/api/vendors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));

        verify(vendorService).getAllVendors();
    }
}
