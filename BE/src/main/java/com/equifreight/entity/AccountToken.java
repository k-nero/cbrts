package com.equifreight.entity;

import com.equifreight.entity.enums.AccountTokenPurpose;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/** Every emailed link (verify email, staff invite, reset password). Only the hash is stored. */
@Setter
@Getter
@Entity
@Table(name = "account_tokens")
public class AccountToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountTokenPurpose purpose;

    @Column(nullable = false, unique = true, length = 100)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant usedAt;

    private Instant revokedAt;

    /** Usable while neither used nor revoked and not yet expired. */
    public boolean isUsable(Instant now) {
        return usedAt == null && revokedAt == null && expiresAt.isAfter(now);
    }
}
