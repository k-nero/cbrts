package com.equifreight.entity;

import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.NotificationSubject;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * One line in a person's notification centre (US-00-07): a pointer to the record something happened to, never
 * evidence (the audit log is). Rows are written by {@code NotificationService.notify}.
 */
@Setter
@Getter
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationKind kind;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 1000)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationSubject entityType;

    @Column(nullable = false)
    private UUID entityId;

    /** The record's code as the row shows it: {@code REQ-2026-0031}, {@code CBRT-2026-014}. */
    @Column(nullable = false, length = 20)
    private String entityCode;

    /** The page this recipient opens the record on, resolved when the row is written. */
    @Column(nullable = false, length = 200)
    private String linkPath;

    /** Repeats of the same notice carry the same key; an unread row is bumped rather than stacked. */
    @Column(length = 120)
    private String dedupeKey;

    private Instant readAt;

    private Instant emailedAt;
}
