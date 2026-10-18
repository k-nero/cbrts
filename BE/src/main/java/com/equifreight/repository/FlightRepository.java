package com.equifreight.repository;

import com.equifreight.entity.Flight;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FlightRepository extends JpaRepository<Flight, UUID> {
    Optional<Flight> findByRouteLegId(UUID routeLegId);
}
