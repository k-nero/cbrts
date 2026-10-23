package com.equifreight.repository;

import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.enums.RoutePlanStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoutePlanRepository extends JpaRepository<RoutePlan, UUID> {
    List<RoutePlan> findByTrip_IdOrderByVersionNoDesc(UUID tripId);

    Optional<RoutePlan> findByTrip_IdAndStatus(UUID tripId, RoutePlanStatus status);

    Optional<RoutePlan> findFirstByTrip_IdOrderByVersionNoDesc(UUID tripId);
}
