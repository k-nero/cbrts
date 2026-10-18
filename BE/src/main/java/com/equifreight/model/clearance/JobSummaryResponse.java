package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import java.util.UUID;
import lombok.*;

/**
 * Lightweight job summary for staff job selection and overview.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobSummaryResponse {
    private UUID id;
    private String code;
    private DossierStatus dossierStatus;
    private JobStage stage;
    private String clubName;
}
