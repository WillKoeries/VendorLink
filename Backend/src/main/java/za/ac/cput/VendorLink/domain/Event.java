package za.ac.cput.VendorLink.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id", nullable = false)
    private User organizer;

    @Column(nullable = false)
    private LocalDate date;

    private LocalDate endDate;

    private String time;

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private String city;

    private String province;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal stallFee;

    @Column(nullable = false)
    private Integer totalStalls;

    @Column(nullable = false)
    private Integer availableStalls;

    private String expectedVisitors;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    private String bannerImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EventStatus status = EventStatus.OPEN;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.availableStalls == null && this.totalStalls != null) {
            this.availableStalls = this.totalStalls;
        }
        if (this.status == null) {
            this.status = EventStatus.OPEN;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
