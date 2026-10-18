package com.equifreight.repository;

import com.equifreight.entity.RegulationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RegulationRuleRepository extends JpaRepository<RegulationRule, UUID>,
        JpaSpecificationExecutor<RegulationRule> {

    /**
     * Lấy toàn bộ quy tắc giấy tờ của 1 phiên bản quy định.
     */
    List<RegulationRule> findByVersionId(UUID versionId);

    /**
     * Lấy quy tắc bắt buộc của 1 phiên bản (dùng khi sinh checklist).
     */
    @Query("SELECT r FROM RegulationRule r WHERE r.version.id = :versionId AND r.mandatory = true")
    List<RegulationRule> findMandatoryByVersionId(@Param("versionId") UUID versionId);
}
