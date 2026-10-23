package com.equifreight.repository;

import com.equifreight.entity.LoadPlanStall;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LoadPlanStallRepository extends JpaRepository<LoadPlanStall, UUID> {
    List<LoadPlanStall> findByLoadPlanId(UUID loadPlanId);

    List<LoadPlanStall> findByLoadPlanIdIn(Collection<UUID> loadPlanIds);

    Optional<LoadPlanStall> findByLoadPlanIdAndVehicleStallId(UUID loadPlanId, UUID vehicleStallId);

    Optional<LoadPlanStall> findByLoadPlanIdAndHorseId(UUID loadPlanId, UUID horseId);

    /*
     * The deletes below are bulk statements that run immediately. Derived deleteBy methods queue entity
     * removals instead, and Hibernate flushes inserts before deletes, so placing a horse into a stall
     * whose old row is still queued for removal broke the (load_plan_id, vehicle_stall_id) and
     * (load_plan_id, horse_id) unique constraints.
     */
    @Modifying(flushAutomatically = true)
    @Query("delete from LoadPlanStall s where s.loadPlan.id = :loadPlanId and s.vehicleStall.id = :vehicleStallId")
    void deleteByLoadPlanIdAndVehicleStallId(
            @Param("loadPlanId") UUID loadPlanId, @Param("vehicleStallId") UUID vehicleStallId);

    @Modifying(flushAutomatically = true)
    @Query("delete from LoadPlanStall s where s.loadPlan.id = :loadPlanId and s.horse.id = :horseId")
    void deleteByLoadPlanIdAndHorseId(@Param("loadPlanId") UUID loadPlanId, @Param("horseId") UUID horseId);

    @Modifying(flushAutomatically = true)
    @Query("delete from LoadPlanStall s where s.loadPlan.id = :loadPlanId")
    void deleteAllForLoadPlan(@Param("loadPlanId") UUID loadPlanId);
}
