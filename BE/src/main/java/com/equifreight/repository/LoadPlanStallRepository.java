package com.equifreight.repository;

import com.equifreight.entity.LoadPlanStall;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoadPlanStallRepository extends JpaRepository<LoadPlanStall, UUID> {
    List<LoadPlanStall> findByLoadPlanId(UUID loadPlanId);
    Optional<LoadPlanStall> findByLoadPlanIdAndVehicleStallId(UUID loadPlanId, UUID vehicleStallId);
    Optional<LoadPlanStall> findByLoadPlanIdAndHorseId(UUID loadPlanId, UUID horseId);
    void deleteByLoadPlanIdAndVehicleStallId(UUID loadPlanId, UUID vehicleStallId);
    void deleteByLoadPlanIdAndHorseId(UUID loadPlanId, UUID horseId);
}
