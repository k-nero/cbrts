package com.equifreight.model.incident;

import com.equifreight.entity.enums.InsuranceClaimStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** The insurance claim on an incident (US-F5-08), in the job's quotation currency. */
public record InsuranceClaimResponse(
        UUID id,
        String insurer,
        String reference,
        BigDecimal claimedAmount,
        String note,
        InsuranceClaimStatus status,
        BigDecimal settledAmount,
        String declineReason,
        String filedByName,
        Instant filedAt,
        String closedByName,
        Instant closedAt) {}
