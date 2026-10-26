package com.equifreight.repository;

import com.equifreight.entity.VehicleBooking;
import java.time.Instant;
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
     * The vehicle's trip bookings that end by {@code at}, latest first, with the trip's corridor and the country it
     * ends in: the first is where the vehicle is at {@code at} (US-F7-01). {@code tripId}'s own booking is left out.
     */
    @Query("SELECT b FROM VehicleBooking b JOIN FETCH b.trip t JOIN FETCH t.corridor c JOIN FETCH c.destinationCountry "
            + "WHERE b.vehicle.id = :vehicleId AND b.kind = com.equifreight.entity.enums.BookingKind.JOB "
            + "AND b.endsAt <= :at AND (:tripId IS NULL OR t.id <> :tripId) ORDER BY b.endsAt DESC")
    List<VehicleBooking> findTripBookingsEndingBy(
            @Param("vehicleId") UUID vehicleId, @Param("at") Instant at, @Param("tripId") UUID tripId);

    @Query("SELECT b FROM VehicleBooking b WHERE b.startsAt < :rangeEnd AND b.endsAt > :rangeStart")
    List<VehicleBooking> findInDateRange(@Param("rangeStart") Instant rangeStart, @Param("rangeEnd") Instant rangeEnd);
}
