package com.equifreight.repository;

import com.equifreight.entity.RouteLeg;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RouteLegRepository extends JpaRepository<RouteLeg, UUID> {
    List<RouteLeg> findByRoutePlanIdOrderBySeq(UUID routePlanId);
}
