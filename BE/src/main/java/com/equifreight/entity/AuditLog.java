package com.equifreight.entity;

import com.equifreight.entity.enums.Channel;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/** One audit line, written in the same transaction as the change (BR-F1-08). Append-only (trigger). */
@Setter
@Getter
@Entity
@Immutable
@Table(name = "audit_log")
public class AuditLog extends BaseEntity {

    @Column(nullable = false)
    private Instant occurredAt = Instant.now();

    /** Null for the system and for someone not signed in. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    /** "Saigon Turf Club", "System", "Not signed in"; kept even if the user is later renamed. */
    @Column(nullable = false, length = 160)
    private String actorLabel;

    @Column(length = 30)
    private String actorRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Channel channel;

    /** For cab records sent later. */
    private Instant deviceRecordedAt;

    /** Machine code, e.g. DOCUMENT_REJECTED, QUOTATION_ISSUED, CATALOG_PUBLISHED. */
    @Column(nullable = false, length = 60)
    private String action;

    /** The sentence the log shows. */
    @Column(nullable = false, length = 500)
    private String summary;

    @Column(length = 40)
    private String entityType;

    private UUID entityId;

    /** REQ-2026-0193, CBRT-2026-041, Catalog KH v8, EF-015: what the search box matches. */
    @Column(length = 20)
    private String entityCode;

    @JdbcTypeCode(SqlTypes.JSON)
    private String before;

    @JdbcTypeCode(SqlTypes.JSON)
    private String after;

    @Column(length = 500)
    private String reason;
}
