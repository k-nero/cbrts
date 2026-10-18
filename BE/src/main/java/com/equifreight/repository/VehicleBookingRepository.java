package com.equifreight.repository;

import com.equifreight.entity.VehicleBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface VehicleBookingRepository extends JpaRepository<VehicleBooking, UUID> {
    List<VehicleBooking> findByVehicleId(UUID vehicleId);

    List<VehicleBooking> findByJobId(UUID jobId);

    @Query("SELECT b FROM VehicleBooking b WHERE b.vehicle.id = :vehicleId " +
            "AND (:excludeId IS NULL OR b.id <> :excludeId) " +
            "AND b.startsAt < :endsAt AND b.endsAt > :startsAt")
    List<VehicleBooking> findOverlappingBookings(
            @Param("vehicleId") UUID vehicleId,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt,
            @Param("excludeId") UUID excludeId);

    @Query("SELECT b FROM VehicleBooking b WHERE b.startsAt < :rangeEnd AND b.endsAt > :rangeStart")
    List<VehicleBooking> findInDateRange(@Param("rangeStart") Instant rangeStart, @Param("rangeEnd") Instant rangeEnd);
}
