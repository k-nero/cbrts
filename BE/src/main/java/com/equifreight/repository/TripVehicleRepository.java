package com.equifreight.repository;

import com.equifreight.entity.TripVehicle;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripVehicleRepository extends JpaRepository<TripVehicle, UUID> {

    List<TripVehicle> findByTrip_IdOrderBySeq(UUID tripId);
}
