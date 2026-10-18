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

@Repository
public interface RegulationVersionRepository extends JpaRepository<RegulationVersion, UUID>,
        JpaSpecificationExecutor<RegulationVersion> {

    /**
     * Lấy tất cả phiên bản quy định của 1 quốc gia (theo catalog).
     */
    List<RegulationVersion> findByCatalogId(UUID catalogId);

    /**
     * Tìm các phiên bản theo trạng thái (PUBLISHED, DRAFT, RETIRED).
     */
    @Query("SELECT rv FROM RegulationVersion rv WHERE rv.catalog.id = :catalogId AND rv.status = :status ORDER BY rv.versionNo DESC")
    List<RegulationVersion> findByCatalogIdAndStatusOrdered(@Param("catalogId") UUID catalogId,
                                                            @Param("status") CatalogStatus status);

    /**
     * Tìm phiên bản DRAFT duy nhất (tối đa 1) của 1 catalog.
     */
    Optional<RegulationVersion> findByCatalogIdAndStatus(UUID catalogId, CatalogStatus status);
}
