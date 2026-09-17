package za.ac.cput.VendorLink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import za.ac.cput.VendorLink.domain.EventStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventResponse {
    private Long id;
    private String title;
    private String description;
    private Long categoryId;
    private String categoryName;
    private Long organizerId;
    private String organizerName;
    private String organizerEmail;
    private LocalDate date;
    private LocalDate endDate;
    private String time;
    private String location;
    private String city;
    private String province;
    private BigDecimal stallFee;
    private Integer totalStalls;
    private Integer availableStalls;
    private String expectedVisitors;
    private String requirements;
    private String bannerImageUrl;
    private EventStatus status;
    private LocalDateTime createdAt;
}
