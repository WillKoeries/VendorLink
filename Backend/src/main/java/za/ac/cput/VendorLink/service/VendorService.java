package za.ac.cput.VendorLink.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.ac.cput.VendorLink.domain.User;
import za.ac.cput.VendorLink.domain.VendorProfile;
import za.ac.cput.VendorLink.dto.request.VendorProfileRequest;
import za.ac.cput.VendorLink.dto.response.VendorProfileResponse;
import za.ac.cput.VendorLink.repository.UserRepository;
import za.ac.cput.VendorLink.repository.VendorProfileRepository;
import za.ac.cput.VendorLink.util.Helper;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VendorService {

    private final VendorProfileRepository vendorProfileRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public VendorProfileResponse getVendorProfile(Long userId) {
        VendorProfile profile = vendorProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));
                    return VendorProfile.builder()
                            .user(user)
                            .businessName(user.getFullName() + "'s Stall")
                            .phone(user.getPhone())
                            .build();
                });
        return Helper.toVendorProfileResponse(profile);
    }

    @Transactional
    public VendorProfileResponse updateVendorProfile(Long userId, VendorProfileRequest request) {
        VendorProfile profile = vendorProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));
                    return VendorProfile.builder().user(user).build();
                });

        profile.setBusinessName(request.getBusinessName().trim());
        profile.setDescription(request.getDescription());
        profile.setCategory(request.getCategory());
        profile.setPhone(request.getPhone());
        profile.setWebsite(request.getWebsite());
        profile.setCity(request.getCity());
        profile.setProvince(request.getProvince());
        profile.setAddress(request.getAddress());
        profile.setProfileImageUrl(request.getProfileImageUrl());

        VendorProfile saved = vendorProfileRepository.save(profile);
        return Helper.toVendorProfileResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<VendorProfileResponse> getAllVendors() {
        return vendorProfileRepository.findAll()
                .stream()
                .map(Helper::toVendorProfileResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VendorProfileResponse getVendorProfileById(Long id) {
        VendorProfile profile = vendorProfileRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Vendor profile not found with ID: " + id));
        return Helper.toVendorProfileResponse(profile);
    }
}
