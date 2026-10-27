package com.equifreight.model.job;

import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.model.route.PlaceResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder(toBuilder = true)
public record JobDetailResponse(
        UUID id,
        String code,
        /** The trip's TRP code; staff only. */
        String tripCode,
        String originCity,
        String destinationCity,
        /** The request's pickup and delivery places, where a first route draft starts and ends (US-F3-17). */
        PlaceResponse originPlace,
        PlaceResponse destinationPlace,
        JobStage stage,
        DossierStatus dossierStatus,
        TripStatus tripStatus,
        Instant plannedDepartureAt,
        Instant windowStart,
        Instant windowEnd,
        Instant clearanceReadyAt,
        String blockingReason,
        String nextStepOwner,
        /** The team assigned at approval (US-F1-07); null on jobs approved before teams were kept. */
        String transportSpecialist,
        String coordinator,
        String clearanceGateState, // "Locked" or "Clear"
        String clearanceGateSummary,
        List<JobHorseResponse> horses,
        TripLoadResponse loadPlan,
        RoutePlanResponse routePlan,
        List<CrewMemberResponse> crew,
        /** Every job on the job's trip, this one included (US-F3-11). */
        List<TripJobResponse> tripJobs,
        /** The job's trips in journey order, one while it travels on one trip (US-F5-06, US-F3-16). */
        List<com.equifreight.model.trip.TripPartResponse> parts,
        /** The city the journey has reached, where the next trip starts; the origin's while it has none (US-F3-21). */
        String journeyEndCity,
        /** True once the journey's last trip ends in the destination city: no trip can be added after it (US-F3-21). */
        boolean journeyComplete,
        /** What to warn about the journey: it ends short of the destination, or leaves the quoted route (US-F3-21). */
        List<String> journeyWarnings,
        /** Which trips of the journey the clearance gate holds back, in words; null with no trip (US-F3-21). */
        String clearanceJourneyNote) {}
