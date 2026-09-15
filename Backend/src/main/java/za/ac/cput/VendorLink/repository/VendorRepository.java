package za.ac.cput.VendorLink.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.ac.cput.VendorLink.domain.User;
import za.ac.cput.VendorLink.domain.Vendor;

import java.util.Optional;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, Long> {
    Optional<Vendor> findByUser(User user);
    Optional<Vendor> findByUserId(Long userId);
}
