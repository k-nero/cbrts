package com.equifreight.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * A biosecurity warning the coordinator accepted for a trip (US-F3-12). The key is derived from the warning's
 * content, so an unchanged warning isn't asked twice and a changed one is asked again.
 */
@Setter
@Getter
@Entity
@Table(
        name = "trip_warning_acceptances",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "trip_warning_acceptances_trip_id_warning_key_key",
                        columnNames = {"trip_id", "warning_key"}))
public class TripWarningAcceptance extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(name = "warning_key", nullable = false, length = 32)
    private String warningKey;

    /** The warning as the coordinator read it. */
    @Column(nullable = false, length = 500)
    private String summary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_by", nullable = false)
    private User acceptedBy;

    @Column(nullable = false)
    private Instant acceptedAt;
}
