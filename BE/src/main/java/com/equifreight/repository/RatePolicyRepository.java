package com.equifreight.repository;

import com.equifreight.entity.RatePolicy;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RatePolicyRepository extends JpaRepository<RatePolicy, RatePolicy.Key> {

    List<RatePolicy> findByIdVersionId(UUID versionId);
}
