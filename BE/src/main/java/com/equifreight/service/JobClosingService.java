package com.equifreight.service;

import com.equifreight.entity.Handover;
import com.equifreight.entity.Incident;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.JobClosingResponse;
import com.equifreight.repository.HandoverRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.TransportJobRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Closing a delivered job (US-F6-04, docs/handover-design.md): the logistics manager closes it once the handover is
 * recorded and no incident on it is still open or decided. It leaves the active boards, and keeps whether the horses
 * arrived on time for the reports.
 */
@Service
public class JobClosingService {

    private static final String ENTITY_TYPE = "TRANSPORT_JOB";
    private static final EnumSet<IncidentStatus> UNRESOLVED = EnumSet.of(IncidentStatus.OPEN, IncidentStatus.DECIDED);

    private final TransportJobRepository jobs;
    private final HandoverRepository handovers;
    private final IncidentRepository incidents;
    private final AuditService audit;
    private final Clock clock;

    public JobClosingService(
            TransportJobRepository jobs,
            HandoverRepository handovers,
            IncidentRepository incidents,
            AuditService audit,
            Clock clock) {
        this.jobs = jobs;
        this.handovers = handovers;
        this.incidents = incidents;
        this.audit = audit;
        this.clock = clock;
    }

    /** Where the job stands on closing: what holds it, or how it was closed. */
    @Transactional(readOnly = true)
    public JobClosingResponse closing(UUID jobId) {
        TransportJob job = job(jobId);
        if (job.getStage() == JobStage.CLOSED) return closed(job);
        return JobClosingResponse.builder()
                .closed(false)
                .blockers(blockers(job))
                .build();
    }

    /**
     * Closes the job: delivered, the handover recorded, no incident unresolved. It records when and by whom, and
     * whether the horses arrived on time: within the window (less a stopped clock), or by the planned arrival when
     * there is no window.
     */
    @Transactional
    public JobClosingResponse close(UUID jobId, User manager) {
        TransportJob job = job(jobId);
        if (job.getStage() == JobStage.CLOSED) {
            throw new BusinessException(job.getCode() + " is already closed");
        }
        List<String> blockers = blockers(job);
        if (!blockers.isEmpty()) {
            throw new BusinessException(job.getCode() + " can't close yet: " + String.join("; ", blockers));
        }
        Handover handover = handovers.findByJob_Id(job.getId()).orElseThrow();
        Instant delivered = handover.getDeliveredAt() != null ? handover.getDeliveredAt() : job.getDeliveredAt();
        boolean window = job.getWindowEnd() != null;
        Integer late = LateArrival.of(
                job, delivered, window ? incidents.findByJob_IdAndStopsClockTrue(job.getId()) : List.of());
        int lateMinutes = late == null ? 0 : late;
        JobStage before = job.getStage();
        job.setStage(JobStage.CLOSED);
        job.setClosedAt(clock.instant());
        job.setClosedBy(manager);
        job.setLateMinutes(lateMinutes);
        job.setOnTime(lateMinutes == 0);
        jobs.save(job);
        audit.recordDecision(
                manager,
                "CLOSE_JOB",
                AuditText.fit("Closed " + job.getCode() + ": "
                        + (lateMinutes == 0
                                ? "delivered on time"
                                : "delivered " + IncidentService.duration(lateMinutes) + " late")
                        + " against " + LateArrival.measuredAgainst(job)),
                ENTITY_TYPE,
                job.getId(),
                job.getCode(),
                null,
                before.name(),
                JobStage.CLOSED.name());
        return closed(job);
    }

    /** What stops the job closing, in words, in the order they are met. */
    List<String> blockers(TransportJob job) {
        List<String> blockers = new ArrayList<>();
        if (job.getTripStatus() != TripStatus.DELIVERED) {
            blockers.add("the horses aren't delivered yet");
        }
        boolean handedOver = handovers
                .findByJob_Id(job.getId())
                .map(h -> h.getHandedOverAt() != null)
                .orElse(false);
        if (!handedOver) blockers.add("the handover isn't recorded");
        List<Incident> open = incidents.findByJob_IdOrderByOpenedAtAsc(job.getId()).stream()
                .filter(i -> UNRESOLVED.contains(i.getStatus()))
                .toList();
        if (!open.isEmpty()) {
            blockers.add(
                    open.size() == 1
                            ? "an incident is still open: "
                                    + open.getFirst().getKind().label()
                            : open.size() + " incidents are still open");
        }
        return blockers;
    }

    private static JobClosingResponse closed(TransportJob job) {
        return JobClosingResponse.builder()
                .closed(true)
                .blockers(List.of())
                .closedAt(job.getClosedAt())
                .closedByName(
                        job.getClosedBy() == null ? null : job.getClosedBy().displayName())
                .onTime(job.getOnTime())
                .lateMinutes(job.getLateMinutes())
                .measuredAgainst(LateArrival.measuredAgainst(job))
                .build();
    }

    private TransportJob job(UUID id) {
        return jobs.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Job", id));
    }
}
