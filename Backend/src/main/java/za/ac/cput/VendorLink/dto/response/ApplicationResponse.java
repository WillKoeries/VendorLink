package za.ac.cput.VendorLink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import za.ac.cput.VendorLink.domain.ApplicationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationResponse {
    private Long id;
    private Long eventId;
    private String eventTitle;
    private LocalDate eventDate;
    private String eventLocation;
    private BigDecimal stallFee;
    private Long vendorId;
    private String vendorName;
    private String vendorEmail;
    private String businessName;
    private String productsDescription;
    private String specialRequirements;
    private ApplicationStatus status;
    private String reviewNotes;
    private LocalDateTime appliedAt;
    private LocalDateTime reviewedAt;
}
