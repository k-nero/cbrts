package com.equifreight.repository;

import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.enums.RatePolicyKey;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RatePolicyRepository extends JpaRepository<RatePolicy, UUID> {

    List<RatePolicy> findByVersionId(UUID versionId);

    Optional<RatePolicy> findByVersionIdAndKey(UUID versionId, RatePolicyKey key);
}
