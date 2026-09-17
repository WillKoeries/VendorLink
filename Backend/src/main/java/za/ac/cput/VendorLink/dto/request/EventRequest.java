package za.ac.cput.VendorLink.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import za.ac.cput.VendorLink.domain.EventStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventRequest {

    @NotBlank(message = "Event title is required")
    private String title;

    private String description;

    private Long categoryId;

    @NotNull(message = "Event date is required")
    private LocalDate date;

    private LocalDate endDate;

    private String time;

    @NotBlank(message = "Location is required")
    private String location;

    @NotBlank(message = "City is required")
    private String city;

    private String province;

    @NotNull(message = "Stall fee is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Stall fee must be at least 0.0")
    private BigDecimal stallFee;

    @NotNull(message = "Total stalls is required")
    @Min(value = 1, message = "Total stalls must be at least 1")
    private Integer totalStalls;

    private Integer availableStalls;

    private String expectedVisitors;

    private String requirements;

    private String bannerImageUrl;

    private EventStatus status;
}
