package com.equifreight.repository;

import com.equifreight.entity.Vehicle;
import com.equifreight.entity.enums.VehicleStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID>, JpaSpecificationExecutor<Vehicle> {
    Optional<Vehicle> findByCode(String code);

    boolean existsByCode(String code);

    List<Vehicle> findAllByStatus(VehicleStatus status);

    /**
     * How many vehicles that aren't retired run each of {@code corridorIds}, as [corridor id, count] rows; a corridor
     * nobody runs has no row (US-F7-01).
     */
    @Query("SELECT c.id, COUNT(v) FROM Vehicle v JOIN v.operatingCorridors c WHERE c.id IN :corridorIds "
            + "AND v.status <> com.equifreight.entity.enums.VehicleStatus.RETIRED GROUP BY c.id")
    List<Object[]> countRunningByCorridor(@Param("corridorIds") Collection<UUID> corridorIds);
}
