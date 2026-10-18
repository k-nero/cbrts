package com.equifreight.repository;

import com.equifreight.entity.VehicleStall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VehicleStallRepository extends JpaRepository<VehicleStall, UUID> {
    List<VehicleStall> findByVehicleIdOrderByPositionNo(UUID vehicleId);
}
