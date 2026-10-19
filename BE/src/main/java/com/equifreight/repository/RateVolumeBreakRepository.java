package com.equifreight.repository;

import com.equifreight.entity.RateVolumeBreak;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateVolumeBreakRepository extends JpaRepository<RateVolumeBreak, UUID> {
    List<RateVolumeBreak> findByVersionIdOrderByMinHorsesAsc(UUID versionId);
}
