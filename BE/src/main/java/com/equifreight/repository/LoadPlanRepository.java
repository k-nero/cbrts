package com.equifreight.repository;

import com.equifreight.entity.LoadPlan;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LoadPlanRepository extends JpaRepository<LoadPlan, UUID> {
    Optional<LoadPlan> findByTripVehicle_Id(UUID tripVehicleId);

    /** The trip's load plans, one per vehicle, in convoy order. */
    List<LoadPlan> findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(UUID tripId);

    /**
     * The vehicle's plan, row-locked until the transaction ends. Every change to the placements
     * takes this lock first, so two coordinators editing the same plan are applied one after the
     * other and the second one's preconditions are checked against the first one's result.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from LoadPlan p where p.tripVehicle.id = :tripVehicleId")
    Optional<LoadPlan> findByTripVehicleIdForUpdate(@Param("tripVehicleId") UUID tripVehicleId);

    /**
     * Every plan of the trip, row-locked until the transaction ends. A horse can move between trailers, so every
     * change to the trip's placements takes all of them, in convoy order so two writers lock in the same order.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from LoadPlan p where p.tripVehicle.trip.id = :tripId order by p.tripVehicle.seq")
    List<LoadPlan> findByTripIdForUpdate(@Param("tripId") UUID tripId);
}
