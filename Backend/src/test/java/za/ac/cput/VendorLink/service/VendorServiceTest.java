package za.ac.cput.VendorLink.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import za.ac.cput.VendorLink.domain.Role;
import za.ac.cput.VendorLink.domain.User;
import za.ac.cput.VendorLink.domain.VendorProfile;
import za.ac.cput.VendorLink.dto.request.VendorProfileRequest;
import za.ac.cput.VendorLink.dto.response.PublicVendorResponse;
import za.ac.cput.VendorLink.dto.response.VendorProfileResponse;
import za.ac.cput.VendorLink.exception.ResourceNotFoundException;
import za.ac.cput.VendorLink.repository.UserRepository;
import za.ac.cput.VendorLink.repository.VendorProfileRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class VendorServiceTest {

    @Mock
    private VendorProfileRepository vendorProfileRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private VendorService vendorService;

    private User vendorUser;
    private VendorProfile profile;

    @BeforeEach
    void setUp() {
        vendorUser = User.builder()
                .id(20L)
                .fullName("Lisa Vendor")
                .email("lisa@vendorlink.co.za")
                .phone("+27 82 123 4567")
                .role(Role.VENDOR)
                .build();

        profile = VendorProfile.builder()
                .id(1L)
                .user(vendorUser)
                .businessName("Lisa's Coffee Bar")
                .description("Specialty artisanal roasted coffee")
                .category("Food & Beverages")
                .phone("+27 82 123 4567")
                .website("https://lisascoffee.co.za")
                .city("Cape Town")
                .province("Western Cape")
                .address("42 Private Residential Street")
                .profileImageUrl("https://example.com/logo.jpg")
                .build();
    }

    @Test
    @DisplayName("getVendorProfileById: should throw exception when vendor not found")
    void getVendorProfileById_shouldThrowWhenNotFound() {
        when(vendorProfileRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> vendorService.getVendorProfileById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Vendor profile not found with ID: 999");
    }

    @Test
    @DisplayName("getVendorProfile: should return full VendorProfileResponse for authenticated owner")
    void getVendorProfile_shouldReturnFullProfileForOwner() {
        when(vendorProfileRepository.findByUserId(20L)).thenReturn(Optional.of(profile));

        VendorProfileResponse response = vendorService.getVendorProfile(20L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getUserId()).isEqualTo(20L);
        assertThat(response.getEmail()).isEqualTo("lisa@vendorlink.co.za");
        assertThat(response.getPhone()).isEqualTo("+27 82 123 4567");
        assertThat(response.getAddress()).isEqualTo("42 Private Residential Street");
    }

    @Test
    @DisplayName("updateVendorProfile: should update and save vendor profile")
    void updateVendorProfile_shouldSaveAndReturnUpdatedProfile() {
        VendorProfileRequest request = VendorProfileRequest.builder()
                .businessName("Lisa's Roastery")
                .description("Updated single-origin roasts")
                .category("Food & Beverages")
                .phone("+27 82 999 8888")
                .website("https://roastery.co.za")
                .city("Stellenbosch")
                .province("Western Cape")
                .address("New Address 10")
                .build();

        when(vendorProfileRepository.findByUserId(20L)).thenReturn(Optional.of(profile));
        when(vendorProfileRepository.save(any(VendorProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VendorProfileResponse response = vendorService.updateVendorProfile(20L, request);

        assertThat(response.getBusinessName()).isEqualTo("Lisa's Roastery");
        assertThat(response.getCity()).isEqualTo("Stellenbosch");
        assertThat(response.getPhone()).isEqualTo("+27 82 999 8888");
        verify(vendorProfileRepository).save(profile);
    }
}
