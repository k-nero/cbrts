package com.equifreight.job;

import com.equifreight.repository.RefreshTokenRepository;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Rotation already deletes a refresh token the moment it is reused, and an
 * expired token presented to {@code /refresh} is purged lazily. A user who
 * simply stops refreshing, though, leaves a dead row behind forever. This sweep
 * reaps those rows so {@code refresh_tokens} doesn't accumulate stale entries.
 *
 * <p>These rows are inert, so it runs hourly.
 */
@Log4j2
@Component
public class RefreshTokenCleanupJob {

    private static final long ONE_HOUR_MS = 3_600_000L;

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenCleanupJob(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    /**
     * fixedDelay so a slow purge can never overlap the next tick. The whole
     * delete commits in one transaction.
     */
    @Scheduled(fixedDelay = ONE_HOUR_MS)
    @Transactional
    public void purgeExpiredTokens() {
        long removed = refreshTokenRepository.deleteByExpiryDateBefore(Instant.now());
        if (removed > 0) {
            log.info("Purged {} expired refresh token(s)", removed);
        }
    }
}
