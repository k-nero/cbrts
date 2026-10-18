package com.equifreight.repository;

import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.enums.CatalogStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The same methods as on feat/flow-2-clearance, so the two branches keep one copy. */
@Repository
public interface RegulationVersionRepository extends JpaRepository<RegulationVersion, UUID>,
        JpaSpecificationExecutor<RegulationVersion> {

    /**
     * Every version of one country's catalog.
     */
    List<RegulationVersion> findByCatalogId(UUID catalogId);

    /**
     * A catalog's versions in one status, newest version first.
     */
    @Query("SELECT rv FROM RegulationVersion rv WHERE rv.catalog.id = :catalogId AND rv.status = :status ORDER BY rv.versionNo DESC")
    List<RegulationVersion> findByCatalogIdAndStatusOrdered(@Param("catalogId") UUID catalogId,
                                                            @Param("status") CatalogStatus status);

    /**
     * The one draft of a catalog (at most one).
     */
    Optional<RegulationVersion> findByCatalogIdAndStatus(UUID catalogId, CatalogStatus status);
}
