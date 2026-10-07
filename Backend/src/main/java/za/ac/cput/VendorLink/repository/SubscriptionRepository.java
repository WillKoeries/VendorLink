package za.ac.cput.VendorLink.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.ac.cput.VendorLink.domain.Subscription;
import za.ac.cput.VendorLink.domain.SubscriptionStatus;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findByMerchantPaymentId(String merchantPaymentId);

    Optional<Subscription> findFirstByUserIdAndStatusOrderByCompletedAtDesc(Long userId, SubscriptionStatus status);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Subscription s set s.status = :to, s.pfPaymentId = :pfPaymentId, s.completedAt = :completedAt " +
            "where s.merchantPaymentId = :merchantPaymentId and s.status = :from")
    int compareAndSetStatus(@Param("merchantPaymentId") String merchantPaymentId,
                             @Param("from") SubscriptionStatus from,
                             @Param("to") SubscriptionStatus to,
                             @Param("pfPaymentId") String pfPaymentId,
                             @Param("completedAt") LocalDateTime completedAt);

    @Modifying
    @Query("update Subscription s set s.status = :cancelled where s.user.id = :userId " +
            "and s.status = :completed and s.merchantPaymentId <> :merchantPaymentId")
    int cancelPrevious(@Param("userId") Long userId,
                       @Param("merchantPaymentId") String merchantPaymentId,
                       @Param("completed") SubscriptionStatus completed,
                       @Param("cancelled") SubscriptionStatus cancelled);
}
