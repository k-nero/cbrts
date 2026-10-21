package com.equifreight.repository;

import com.equifreight.entity.RateFeeBand;
import com.equifreight.entity.enums.FeeBandKind;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateFeeBandRepository extends JpaRepository<RateFeeBand, UUID> {

    List<RateFeeBand> findByVersionIdOrderByKindAscMinDaysAsc(UUID versionId);

    /** A version's bands of one kind, shortest notice first. */
    List<RateFeeBand> findByVersionIdAndKindOrderByMinDays(UUID versionId, FeeBandKind kind);
}
