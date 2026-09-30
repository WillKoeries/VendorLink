package za.ac.cput.VendorLink.domain;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum ApplicationStatus {
    PENDING, APPROVED, REJECTED, CANCELLED;

    private static final Map<ApplicationStatus, Set<ApplicationStatus>> ORGANIZER_MOVES = Map.of(
            PENDING,   EnumSet.of(APPROVED, REJECTED),
            APPROVED,  EnumSet.of(REJECTED),
            REJECTED,  EnumSet.of(APPROVED),
            CANCELLED, EnumSet.noneOf(ApplicationStatus.class));

    public boolean organizerMayMoveTo(ApplicationStatus next) {
        return ORGANIZER_MOVES.get(this).contains(next);
    }
}
