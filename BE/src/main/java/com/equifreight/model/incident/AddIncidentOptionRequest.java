package com.equifreight.model.incident;

import com.equifreight.entity.enums.LeavingKind;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * An option for handling an incident (US-F5-02): what it is, its estimated extra cost in the job's quotation currency,
 * the minutes it adds to the arrival, and whether it takes the horses another way.
 */
public record AddIncidentOptionRequest(
        @NotBlank @Size(max = 160) String title,
        @Size(max = 1000) String description,

        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2)
        BigDecimal extraCost,

        @Min(0) @Max(7 * 24 * 60) int delayMinutes,
        boolean changesRoute,
        /** How horses leave the moving trip, when the option takes any off it (US-F5-06); null otherwise. */
        LeavingKind leavingKind,
        /** The horses that leave; empty for every horse of the incident's job on the trip. */
        List<UUID> horseIds,
        /** Where they are unloaded or left in care; required for those two. */
        @Size(max = 200) String leavingPlace,
        /** The second vehicle that collects them; required for that option. */
        UUID vehicleId,
        /** Who bears the extra cost as proposed: the customer, else EquiFreight. */
        boolean customerPays) {

    public AddIncidentOptionRequest {
        horseIds = horseIds == null ? List.of() : List.copyOf(horseIds);
    }

    /** An option that takes no horse off the trip (US-F5-02). */
    public AddIncidentOptionRequest(
            String title, String description, BigDecimal extraCost, int delayMinutes, boolean changesRoute) {
        this(title, description, extraCost, delayMinutes, changesRoute, null, List.of(), null, null, false);
    }
}
