package com.equifreight.repository;

import com.equifreight.entity.RateCatalogVersion;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateCatalogVersionRepository extends JpaRepository<RateCatalogVersion, UUID> {
    Optional<RateCatalogVersion> findByVersionNo(int versionNo);
}
