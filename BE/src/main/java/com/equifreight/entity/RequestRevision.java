package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * Keeps both versions of a request visible after an INFO_REQUIRED round.
 */
@Setter
@Getter
@Entity
@Table(name = "request_revisions")
public class RequestRevision extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private TransportRequest request;

    @Column(nullable = false)
    private short revisionNo;

    /**
     * The request as submitted, as JSON.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String payload;

    @Column(nullable = false)
    private Instant submittedAt;

    @Column(length = 500)
    private String note;
}
