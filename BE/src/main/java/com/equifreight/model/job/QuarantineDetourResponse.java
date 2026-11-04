package com.equifreight.model.job;

import java.time.LocalDate;
import java.util.UUID;

/**
 * A quarantine station no trip of a job's journey takes the horses to yet, and the road trip that can be routed by way
 * of it (US-F3-22): that trip hands the horses on at the station, and a new local run takes them on from there.
 */
public record QuarantineDetourResponse(
        UUID placeId, String placeName, LocalDate startsOn, LocalDate endsOn, UUID tripId, String tripCode) {}
