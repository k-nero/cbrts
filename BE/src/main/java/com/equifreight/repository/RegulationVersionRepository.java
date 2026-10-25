package com.equifreight.repository;

import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.enums.CatalogStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** The same methods as on feat/flow-2-clearance, so the two branches keep one copy. */
@Repository
public interface RegulationVersionRepository
        extends JpaRepository<RegulationVersion, UUID>, JpaSpecificationExecutor<RegulationVersion> {

    /**
     * Every version of one country's catalog.
     */
    List<RegulationVersion> findByCatalogId(UUID catalogId);

    /**
     * Every version of every catalog with its publisher, newest version first: the catalog list, in one query.
     */
    @EntityGraph(attributePaths = "publishedBy")
    List<RegulationVersion> findAllByOrderByVersionNoDesc();

    /**
     * A catalog's versions in one status, newest version first.
     */
    @Query(
            "SELECT rv FROM RegulationVersion rv WHERE rv.catalog.id = :catalogId AND rv.status = :status ORDER BY rv.versionNo DESC")
    List<RegulationVersion> findByCatalogIdAndStatusOrdered(
            @Param("catalogId") UUID catalogId, @Param("status") CatalogStatus status);

    /**
     * The one draft of a catalog (at most one).
     */
    Optional<RegulationVersion> findByCatalogIdAndStatus(UUID catalogId, CatalogStatus status);
}
