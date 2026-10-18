package com.equifreight.repository;

import com.equifreight.entity.RateVolumeBreak;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RateVolumeBreakRepository extends JpaRepository<RateVolumeBreak, UUID> {

    List<RateVolumeBreak> findByVersionId(UUID versionId);

    /** Removes one corridor's own bands at once (a bulk delete runs before the replacing inserts). */
    @Modifying
    @Query("delete from RateVolumeBreak b where b.version.id = :versionId and b.corridor.id = :corridorId")
    void deleteCorridorBands(@Param("versionId") UUID versionId, @Param("corridorId") UUID corridorId);

    /** Removes the every-corridor bands at once. */
    @Modifying
    @Query("delete from RateVolumeBreak b where b.version.id = :versionId and b.corridor is null")
    void deleteGlobalBands(@Param("versionId") UUID versionId);
}
