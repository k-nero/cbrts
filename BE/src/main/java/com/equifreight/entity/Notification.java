package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** Sidebar badges and the bell read from it. */
@Setter
@Getter
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 40)
    private String kind;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 1000)
    private String body;

    @Column(length = 40)
    private String entityType;

    private UUID entityId;

    private Instant readAt;

    private Instant emailedAt;
}
