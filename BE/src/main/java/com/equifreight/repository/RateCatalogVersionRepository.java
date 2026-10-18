package com.equifreight.repository;

import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.enums.CatalogStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface RateCatalogVersionRepository extends JpaRepository<RateCatalogVersion, UUID> {

    Optional<RateCatalogVersion> findByVersionNo(int versionNo);

    /** The current published version (the newest one PUBLISHED). */
    Optional<RateCatalogVersion> findFirstByStatusOrderByVersionNoDesc(CatalogStatus status);

    /** The one draft (at most one, V4 index). */
    Optional<RateCatalogVersion> findByStatus(CatalogStatus status);

    List<RateCatalogVersion> findAllByOrderByVersionNoDesc();

    @Query("select max(v.versionNo) from RateCatalogVersion v")
    Integer maxVersionNo();
}
