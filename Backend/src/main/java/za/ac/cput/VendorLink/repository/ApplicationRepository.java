package za.ac.cput.VendorLink.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.ac.cput.VendorLink.domain.Application;
import za.ac.cput.VendorLink.domain.ApplicationStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

       List<Application> findByVendorIdOrderByAppliedAtDesc(Long vendorId);

       List<Application> findByEventIdOrderByAppliedAtDesc(Long eventId);

       List<Application> findByEvent_Organizer_IdOrderByAppliedAtDesc(Long organizerId);

       List<Application> findTop5ByEvent_Organizer_IdOrderByAppliedAtDesc(Long organizerId);

       List<Application> findByEvent_Organizer_IdAndStatus(Long organizerId, ApplicationStatus status);

       boolean existsByEventIdAndVendorId(Long eventId, Long vendorId);

       Optional<Application> findByEventIdAndVendorId(Long eventId, Long vendorId);

       long countByEvent_Organizer_Id(Long organizerId);

       long countByEvent_Organizer_IdAndStatus(Long organizerId, ApplicationStatus status);
}
