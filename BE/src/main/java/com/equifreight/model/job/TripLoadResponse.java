package com.equifreight.model.job;

import com.equifreight.entity.enums.LoadPlanStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

/**
 * How the trip is loaded: one load plan per trailer in convoy order, and the horses on the trip not yet placed on
 * any of them (US-F3-10). It is CONFIRMED once every trailer's plan is.
 */
@Builder
public record TripLoadResponse(
        String tripCode,
        LoadPlanStatus status,
        String confirmedByName,
        Instant confirmedAt,
        int totalWeightKg,
        int payloadKg,
        List<LoadPlanResponse> vehicles,
        List<JobHorseResponse> unassignedHorses,
        /** Every trailer's conflicts. */
        List<LoadPlanConflictResponse> conflicts,
        /** Biosecurity warnings for horses of different jobs on one trailer (US-F3-12). */
        List<BiosecurityWarningResponse> warnings) {}
