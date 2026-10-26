package com.equifreight.repository;

import com.equifreight.entity.Trip;
import com.equifreight.entity.TripVehicle;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripVehicleRepository extends JpaRepository<TripVehicle, UUID> {

    List<TripVehicle> findByTrip_IdOrderBySeq(UUID tripId);

    /**
     * The trips the vehicle is on that haven't ended by {@code now}: its booking for the trip ends later, or the trip
     * isn't booked yet (US-F7-01). Earliest departure first; a trip with no planned departure comes last.
     */
    @Query("SELECT tv.trip FROM TripVehicle tv JOIN tv.trip t WHERE tv.vehicle.id = :vehicleId "
            + "AND NOT EXISTS (SELECT b FROM VehicleBooking b WHERE b.trip = t AND b.vehicle = tv.vehicle "
            + "AND b.endsAt <= :now) "
            + "ORDER BY t.plannedDepartureAt ASC NULLS LAST")
    List<Trip> findOpenTrips(@Param("vehicleId") UUID vehicleId, @Param("now") Instant now);

    /** As {@link #findOpenTrips}, on one of {@code corridorIds}. */
    @Query("SELECT tv.trip FROM TripVehicle tv JOIN tv.trip t WHERE tv.vehicle.id = :vehicleId "
            + "AND t.corridor.id IN :corridorIds "
            + "AND NOT EXISTS (SELECT b FROM VehicleBooking b WHERE b.trip = t AND b.vehicle = tv.vehicle "
            + "AND b.endsAt <= :now) "
            + "ORDER BY t.plannedDepartureAt ASC NULLS LAST")
    List<Trip> findOpenTripsOn(
            @Param("vehicleId") UUID vehicleId,
            @Param("corridorIds") Collection<UUID> corridorIds,
            @Param("now") Instant now);
}
