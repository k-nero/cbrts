package com.equifreight.entity;

import com.equifreight.entity.enums.Channel;
import com.equifreight.entity.enums.TripRecordKind;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The escort's log and the only source of positions. Append-only (trigger). A DEPARTED record is refused unless the
 * job is CLEARANCE_READY (BR-F2-03).
 */
@Setter
@Getter
@Entity
@Immutable
@Table(name = "trip_records")
public class TripRecord extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    /** The checkpoint, if any. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_stop_id")
    private RouteStop routeStop;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripRecordKind kind;

    /** The cab's clock. */
    @Column(nullable = false)
    private Instant occurredAt;

    /** The server's clock; the gap shows records sent late from the cab. */
    @Column(nullable = false)
    private Instant receivedAt = Instant.now();

    /** Generated on the tablet, so a record re-sent after a lost connection is stored once. */
    @Column(unique = true)
    private UUID clientRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by")
    private User recordedBy;

    /** CAB_TABLET or WEB. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Channel channel;

    @Column(length = 500)
    private String text;

    @OneToMany(mappedBy = "tripRecord", cascade = CascadeType.PERSIST)
    private List<ConditionLog> conditionLogs = new ArrayList<>();
}
