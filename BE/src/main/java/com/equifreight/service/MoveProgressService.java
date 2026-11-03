package com.equifreight.service;

import com.equifreight.entity.Handover;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.HandoverOutcome;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.model.request.MoveProgressResponse;
import com.equifreight.repository.HandoverRepository;
import com.equifreight.repository.TransportJobRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * An approved request's move after approval (BR-F1-05): the request stays Approved, so where it stands is read from
 * its job and the handover, in the customer's words.
 */
@Service
public class MoveProgressService {

    private final TransportJobRepository jobs;
    private final HandoverRepository handovers;

    public MoveProgressService(TransportJobRepository jobs, HandoverRepository handovers) {
        this.jobs = jobs;
        this.handovers = handovers;
    }

    /** Each request's move, keyed by request id; a request without a job has none. */
    @Transactional(readOnly = true)
    public Map<UUID, MoveProgressResponse> of(Collection<UUID> requestIds) {
        Map<UUID, MoveProgressResponse> out = new HashMap<>();
        if (requestIds.isEmpty()) return out;
        Map<UUID, TransportJob> jobOf = new HashMap<>();
        jobs.findByRequestIdIn(requestIds).forEach(j -> jobOf.put(j.getId(), j));
        if (jobOf.isEmpty()) return out;
        Map<UUID, Handover> handoverOf = new HashMap<>();
        handovers
                .findByJob_IdIn(jobOf.keySet())
                .forEach(h -> handoverOf.put(h.getJob().getId(), h));
        jobOf.values().forEach(j -> out.put(j.getRequest().getId(), of(j, handoverOf.get(j.getId()))));
        return out;
    }

    static MoveProgressResponse of(TransportJob job, Handover handover) {
        HandoverOutcome answer = handover == null ? null : handover.getCustomerOutcome();
        if (job.getStage() == JobStage.CLOSED || answer == HandoverOutcome.CONFIRMED_SOUND)
            return new MoveProgressResponse("Completed", "ok", true);
        if (answer == HandoverOutcome.PROBLEM_REPORTED)
            return new MoveProgressResponse("Problem reported", "warn", true);
        if (handover != null && handover.getHandedOverAt() != null)
            return new MoveProgressResponse("Confirm handover", "warn", true);
        TripStatus trip = job.getTripStatus();
        if (trip == TripStatus.DELIVERED || trip == TripStatus.ARRIVED)
            return new MoveProgressResponse("Delivered", "ok", true);
        if (trip == TripStatus.HELD) return new MoveProgressResponse("Held on the road", "warn", true);
        if (trip == TripStatus.DEPARTED) return new MoveProgressResponse("In transit", "info", true);
        if (job.getDossierStatus() == DossierStatus.CLEARANCE_READY)
            return new MoveProgressResponse("Cleared to depart", "ok", false);
        return job.getStage() == JobStage.CLEARANCE
                ? new MoveProgressResponse("In clearance", "info", false)
                : new MoveProgressResponse("Documents", "info", false);
    }
}
