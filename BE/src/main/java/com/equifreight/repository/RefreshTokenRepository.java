package com.equifreight.repository;

import com.equifreight.entity.RefreshToken;
import com.equifreight.entity.User;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);

    void deleteByUser(User user);

    /**
     * Purges tokens whose lifetime has already elapsed. Returns the number removed.
     */
    long deleteByExpiryDateBefore(Instant cutoff);
}
