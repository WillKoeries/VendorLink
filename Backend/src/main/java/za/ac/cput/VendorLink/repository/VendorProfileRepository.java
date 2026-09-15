package za.ac.cput.VendorLink.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.ac.cput.VendorLink.domain.User;
import za.ac.cput.VendorLink.domain.VendorProfile;

import java.util.List;
import java.util.Optional;

@Repository
public interface VendorProfileRepository extends JpaRepository<VendorProfile, Long> {
    Optional<VendorProfile> findByUser(User user);
    Optional<VendorProfile> findByUserId(Long userId);
    List<VendorProfile> findByCategoryIgnoreCase(String category);
}
