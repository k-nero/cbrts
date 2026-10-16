package com.equifreight.repository;

import com.equifreight.entity.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RouteStopRepository extends JpaRepository<RouteStop, UUID> {
    List<RouteStop> findByRoutePlanIdOrderBySeq(UUID routePlanId);
}
