package com.equifreight.repository;

import com.equifreight.entity.RegulationCatalog;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface RegulationCatalogRepository
        extends JpaRepository<RegulationCatalog, UUID>, JpaSpecificationExecutor<RegulationCatalog> {

    /**
     * Tìm danh mục quy định theo mã quốc gia (VD: "VN", "JP").
     */
    Optional<RegulationCatalog> findByCountryCode(String countryCode);

    boolean existsByCountryCode(String countryCode);
}
