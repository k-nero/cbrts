package com.equifreight.repository;

import com.equifreight.entity.RouteStop;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RouteStopRepository extends JpaRepository<RouteStop, UUID> {
    List<RouteStop> findByRoutePlanIdOrderBySeq(UUID routePlanId);
}
