package com.equifreight.repository;

import com.equifreight.entity.Flight;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FlightRepository extends JpaRepository<Flight, UUID> {
    Optional<Flight> findByRouteLegId(UUID routeLegId);
}
