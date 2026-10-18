package com.equifreight.repository;

import com.equifreight.entity.RouteLeg;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RouteLegRepository extends JpaRepository<RouteLeg, UUID> {
    List<RouteLeg> findByRoutePlanIdOrderBySeq(UUID routePlanId);
}
