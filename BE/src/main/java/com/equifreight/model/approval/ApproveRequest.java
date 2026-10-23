package com.equifreight.model.approval;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Builder;

/**
 * The logistics manager approves an accepted request into a job (US-F1-07) and names its team.
 *
 * @param transportSpecialistId who owns the job's documents and clearance
 * @param coordinatorId the fleet & route coordinator who plans it
 */
@Builder
public record ApproveRequest(
        @NotNull(message = "Choose the transport specialist.")
        UUID transportSpecialistId,

        @NotNull(message = "Choose the fleet & route coordinator.")
        UUID coordinatorId) {}
