package com.equifreight.repository;

import com.equifreight.entity.RateFeeBand;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateFeeBandRepository extends JpaRepository<RateFeeBand, UUID> {

    List<RateFeeBand> findByVersionIdOrderByKindAscMinDaysAsc(UUID versionId);
}
