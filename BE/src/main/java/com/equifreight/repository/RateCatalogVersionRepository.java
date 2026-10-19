package com.equifreight.repository;

import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.enums.CatalogStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RateCatalogVersionRepository extends JpaRepository<RateCatalogVersion, UUID> {

    Optional<RateCatalogVersion> findByVersionNo(int versionNo);

    Optional<RateCatalogVersion> findByStatus(CatalogStatus status);

    List<RateCatalogVersion> findByStatusOrderByVersionNoDesc(CatalogStatus status);

    List<RateCatalogVersion> findAllByOrderByVersionNoDesc();
    /** The current published version (the newest one PUBLISHED). */
    Optional<RateCatalogVersion> findFirstByStatusOrderByVersionNoDesc(CatalogStatus status);

    /** The one draft (at most one, V4 index). */
    Optional<RateCatalogVersion> findByStatus(CatalogStatus status);

    /**
     * The version in a status, its row locked until the transaction ends: every draft write takes it, so a write
     * that waited on a publish or a discard finds no draft instead of writing over the published row.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from RateCatalogVersion v where v.status = :status")
    Optional<RateCatalogVersion> lockByStatus(@Param("status") CatalogStatus status);

    List<RateCatalogVersion> findAllByOrderByVersionNoDesc();

    @Query("select max(v.versionNo) from RateCatalogVersion v")
    Integer maxVersionNo();
}
