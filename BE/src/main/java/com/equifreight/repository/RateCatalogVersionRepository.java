package com.equifreight.repository;

import com.equifreight.entity.RateCatalogVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RateCatalogVersionRepository extends JpaRepository<RateCatalogVersion, UUID> {
    Optional<RateCatalogVersion> findByVersionNo(int versionNo);
}
