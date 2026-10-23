package za.ac.cput.VendorLink.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "applications", uniqueConstraints = @UniqueConstraint(columnNames = { "event_id", "vendor_id" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    private User vendor;

    @Column(nullable = false)
    private String businessName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String productsDescription;

    @Column(columnDefinition = "TEXT")
    private String specialRequirements;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(updatable = false)
    private LocalDateTime appliedAt;

    private LocalDateTime reviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ApplicationPaymentStatus paymentStatus = ApplicationPaymentStatus.NOT_REQUIRED;

    @Column(precision = 10, scale = 2)
    private BigDecimal paymentAmount;

    @Column(unique = true, length = 64)
    private String merchantPaymentId;

    @Column(unique = true, length = 64)
    private String pfPaymentId;

    private LocalDateTime paymentCompletedAt;

    @PrePersist
    public void prePersist() {
        this.appliedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ApplicationStatus.PENDING;
        }
    }
}
