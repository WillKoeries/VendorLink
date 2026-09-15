package za.ac.cput.VendorLink.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.ac.cput.VendorLink.domain.Organizer;
import za.ac.cput.VendorLink.domain.User;

import java.util.Optional;

@Repository
public interface OrganizerRepository extends JpaRepository<Organizer, Long> {
    Optional<Organizer> findByUser(User user);
    Optional<Organizer> findByUserId(Long userId);
}
