package com.equifreight.repository;

import com.equifreight.entity.RegulationCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/** The same methods as on feat/flow-2-clearance, so the two branches keep one copy. */
@Repository
public interface RegulationCatalogRepository extends JpaRepository<RegulationCatalog, UUID>,
        JpaSpecificationExecutor<RegulationCatalog> {

    /**
     * A country's catalog ("VN").
     */
    Optional<RegulationCatalog> findByCountryCode(String countryCode);

    boolean existsByCountryCode(String countryCode);
}
