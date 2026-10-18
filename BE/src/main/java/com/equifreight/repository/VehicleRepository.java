package com.equifreight.repository;

import com.equifreight.entity.Vehicle;
import com.equifreight.entity.enums.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID>, JpaSpecificationExecutor<Vehicle> {
    Optional<Vehicle> findByCode(String code);

    boolean existsByCode(String code);

    List<Vehicle> findAllByStatus(VehicleStatus status);
}
