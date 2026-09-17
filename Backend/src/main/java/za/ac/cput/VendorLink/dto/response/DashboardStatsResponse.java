package za.ac.cput.VendorLink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {
    private long totalEvents;
    private long totalApplications;
    private long approvedVendors;
    private BigDecimal totalRevenue;
    private List<EventResponse> upcomingEvents;
    private List<ApplicationResponse> recentApplications;
}
