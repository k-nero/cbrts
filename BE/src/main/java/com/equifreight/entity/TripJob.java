package com.equifreight.entity;

import com.equifreight.entity.enums.TripStatus;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * A job's part on one trip (US-F5-06): where it stands on that trip, when that part left and was delivered, and the
 * manager's sign-off of that trip for it. A job is on one trip until an incident takes some of its horses onto
 * another; the job's own status is then the summary of its parts ({@code JobTripService.summarize}).
 */
@Setter
@Getter
@Entity
@Table(
        name = "trip_jobs",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "trip_jobs_trip_id_job_id_key",
                        columnNames = {"trip_id", "job_id"}))
public class TripJob extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TripStatus status = TripStatus.NOT_STARTED;

    private Instant departedAt;

    private Instant deliveredAt;

    private Instant signedOffAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signed_off_by")
    private User signedOffBy;

    /**
     * The job's part on the next trip of its chain (US-F3-16): where this part's horses go when it hands them on.
     * Null on the last part. Two parts can hand on to one: an incident that moved some horses off a trip of the chain
     * keeps them on the journey.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "next_trip_job_id")
    private TripJob next;

    /** Whether this part has left: the trip is moving with it, or has delivered it. */
    public boolean departed() {
        return status != TripStatus.NOT_STARTED;
    }

    /** Released to the crew: signed off, or already moving. */
    public boolean released() {
        return signedOffAt != null || departed();
    }
}
