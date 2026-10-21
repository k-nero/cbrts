package com.equifreight.repository;

import com.equifreight.entity.RegulationRule;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RegulationRuleRepository
        extends JpaRepository<RegulationRule, UUID>, JpaSpecificationExecutor<RegulationRule> {

    /**
     * Every document rule of one regulation version.
     */
    List<RegulationRule> findByVersionId(UUID versionId);

    /**
     * The mandatory rules of one version.
     */
    @Query("SELECT r FROM RegulationRule r WHERE r.version.id = :versionId AND r.mandatory = true")
    List<RegulationRule> findMandatoryByVersionId(@Param("versionId") UUID versionId);

    /**
     * Every rule of these versions with its document type, in one query: the checklist is generated from them.
     */
    @EntityGraph(attributePaths = "documentType")
    List<RegulationRule> findByVersionIdIn(Collection<UUID> versionIds);
}
