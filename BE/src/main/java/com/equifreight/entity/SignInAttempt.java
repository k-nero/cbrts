package com.equifreight.entity;

import jakarta.persistence.*;
import java.net.InetAddress;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Feeds the lock rule and the audit line "3 failed sign-ins for …".
 */
@Setter
@Getter
@Entity
@Table(name = "sign_in_attempts")
public class SignInAttempt extends BaseEntity {

    @Column(nullable = false, length = 255)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private boolean succeeded;

    @JdbcTypeCode(SqlTypes.INET)
    private InetAddress ip;

    @Column(nullable = false)
    private Instant attemptedAt = Instant.now();
}
