package com.equifreight.repository;

import com.equifreight.entity.RateLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateLineRepository extends JpaRepository<RateLine, UUID> {
    List<RateLine> findByVersionId(UUID versionId);

    List<RateLine> findByVersionIdAndCorridorId(UUID versionId, UUID corridorId);

    List<RateLine> findByVersionIdAndCorridorIdIsNull(UUID versionId);
}
