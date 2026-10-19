package com.equifreight.repository;

import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.enums.CatalogStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateCatalogVersionRepository extends JpaRepository<RateCatalogVersion, UUID> {
    Optional<RateCatalogVersion> findByVersionNo(int versionNo);

    Optional<RateCatalogVersion> findByStatus(CatalogStatus status);

    List<RateCatalogVersion> findByStatusOrderByVersionNoDesc(CatalogStatus status);

    List<RateCatalogVersion> findAllByOrderByVersionNoDesc();
}
