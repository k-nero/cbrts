package com.equifreight.model.approval;

import java.util.UUID;
import lombok.Builder;

/** The job an approved request became, with its team; names are null on jobs approved before teams were kept. */
@Builder
public record JobRefResponse(UUID id, String code, String transportSpecialist, String coordinator) {}
