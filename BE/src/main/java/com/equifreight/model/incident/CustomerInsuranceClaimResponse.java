package com.equifreight.model.incident;

import com.equifreight.entity.enums.InsuranceClaimStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * An insurance claim as the customer reads it on their request (US-F5-08): which job and incident it is for, with
 * whom, what was claimed and what came of it. The staff note and who filed it stay with staff.
 */
public record CustomerInsuranceClaimResponse(
        UUID id,
        String jobCode,
        String incidentLabel,
        String insurer,
        String reference,
        String currency,
        BigDecimal claimedAmount,
        InsuranceClaimStatus status,
        BigDecimal settledAmount,
        String declineReason,
        Instant filedAt,
        Instant closedAt) {}
