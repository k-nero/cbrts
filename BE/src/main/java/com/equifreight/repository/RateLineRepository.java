package com.equifreight.repository;

import com.equifreight.entity.RateLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateLineRepository extends JpaRepository<RateLine, UUID> {

    List<RateLine> findByVersionId(UUID versionId);

    /** Whether any catalog version holds a line: the rate seeder runs only on a catalog without rates. */
    boolean existsBy();
}
