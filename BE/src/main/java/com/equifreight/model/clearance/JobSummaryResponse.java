package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import java.util.UUID;
import lombok.Builder;

/**
 * Lightweight job summary for staff job selection and overview.
 */
@Builder
public record JobSummaryResponse(
        UUID id,
        String code,
        DossierStatus dossierStatus,
        JobStage stage,
        String clubName,
        // The route, for the picker; a request may still lack either place.
        String originCity,
        String destinationCity) {}
