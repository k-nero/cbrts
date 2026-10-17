package com.equifreight.repository;

import com.equifreight.entity.VehicleStall;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VehicleStallRepository extends JpaRepository<VehicleStall, UUID> {
    List<VehicleStall> findByVehicleIdOrderByPositionNo(UUID vehicleId);
}
