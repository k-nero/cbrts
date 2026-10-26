package com.equifreight.repository;

import com.equifreight.entity.VehicleBooking;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface VehicleBookingRepository extends JpaRepository<VehicleBooking, UUID> {
    List<VehicleBooking> findByVehicleId(UUID vehicleId);

    List<VehicleBooking> findByTrip_Id(UUID tripId);

    Optional<VehicleBooking> findByTrip_IdAndVehicle_Id(UUID tripId, UUID vehicleId);

    @Query("SELECT b FROM VehicleBooking b WHERE b.vehicle.id = :vehicleId "
            + "AND (:excludeId IS NULL OR b.id <> :excludeId) "
            + "AND b.startsAt < :endsAt AND b.endsAt > :startsAt")
    List<VehicleBooking> findOverlappingBookings(
            @Param("vehicleId") UUID vehicleId,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt,
            @Param("excludeId") UUID excludeId);

    /**
     * Every booking of the vehicle, earliest first, with the corridor a trip or a hold ends on and its countries: where
     * the vehicle is and when it is free, worked out in memory (US-F7-02).
     */
    @Query("SELECT b FROM VehicleBooking b LEFT JOIN FETCH b.trip t LEFT JOIN FETCH t.corridor tc "
            + "LEFT JOIN FETCH tc.destinationCountry LEFT JOIN FETCH b.request r LEFT JOIN FETCH r.corridor rc "
            + "LEFT JOIN FETCH rc.destinationCountry WHERE b.vehicle.id = :vehicleId ORDER BY b.startsAt")
    List<VehicleBooking> findForAvailability(@Param("vehicleId") UUID vehicleId);

    /** The holds for these requests (US-F7-02). */
    List<VehicleBooking> findByRequest_IdIn(Collection<UUID> requestIds);

    /** The hold for this request, if any (US-F7-02). */
    Optional<VehicleBooking> findFirstByRequest_Id(UUID requestId);

    @Query("SELECT b FROM VehicleBooking b WHERE b.startsAt < :rangeEnd AND b.endsAt > :rangeStart")
    List<VehicleBooking> findInDateRange(@Param("rangeStart") Instant rangeStart, @Param("rangeEnd") Instant rangeEnd);
}
