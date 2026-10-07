package za.ac.cput.VendorLink.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.ac.cput.VendorLink.domain.Event;
import za.ac.cput.VendorLink.domain.EventStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

        List<Event> findByOrganizerIdOrderByDateAsc(Long organizerId);

        List<Event> findByStatusOrderByDateAsc(EventStatus status);

        long countByOrganizerId(Long organizerId);

        @Query("SELECT e FROM Event e WHERE " +
                        "(:status IS NULL OR e.status = :status) AND " +
                        "(:categoryId IS NULL OR (e.category IS NOT NULL AND e.category.id = :categoryId)) AND " +
                        "(:province IS NULL OR LOWER(e.province) = LOWER(CAST(:province AS String))) AND " +
                        "(:city IS NULL OR LOWER(e.city) LIKE LOWER(CONCAT('%', CAST(:city AS String), '%'))) AND " +
                        "(:date IS NULL OR e.date >= :date) AND " +
                        "(:search IS NULL OR LOWER(e.title) LIKE LOWER(CONCAT('%', CAST(:search AS String), '%')) " +
                        " OR LOWER(e.description) LIKE LOWER(CONCAT('%', CAST(:search AS String), '%')) " +
                        " OR LOWER(e.location) LIKE LOWER(CONCAT('%', CAST(:search AS String), '%'))) " +
                        "ORDER BY e.date ASC")
        List<Event> searchEvents(
                        @Param("status") EventStatus status,
                        @Param("categoryId") Long categoryId,
                        @Param("province") String province,
                        @Param("city") String city,
                        @Param("date") LocalDate date,
                        @Param("search") String search);

        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT e FROM Event e WHERE e.id = :id")
        Optional<Event> findByIdForUpdate(@Param("id") Long id);

        @Modifying(flushAutomatically = true)
        @Query("UPDATE Event e SET e.availableStalls = e.availableStalls - 1 " +
                        "WHERE e.id = :id AND e.availableStalls > 0")
        int claimStall(@Param("id") Long id);

        @Modifying(flushAutomatically = true)
        @Query("UPDATE Event e SET e.availableStalls = e.availableStalls + 1 " +
                        "WHERE e.id = :id AND e.availableStalls < e.totalStalls")
        int releaseStall(@Param("id") Long id);

        @Modifying(flushAutomatically = true)
        @Query("UPDATE Event e SET e.status = :to WHERE e.id = :id AND e.status = :from AND e.availableStalls = 0")
        int closeIfFull(@Param("id") Long id, @Param("from") EventStatus from, @Param("to") EventStatus to);

        @Modifying(flushAutomatically = true)
        @Query("UPDATE Event e SET e.status = :to WHERE e.id = :id AND e.status = :from AND e.availableStalls > 0")
        int reopenIfSpace(@Param("id") Long id, @Param("from") EventStatus from, @Param("to") EventStatus to);

}
