package com.equifreight.repository;

import com.equifreight.entity.TripWarningAcceptance;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripWarningAcceptanceRepository extends JpaRepository<TripWarningAcceptance, UUID> {

    List<TripWarningAcceptance> findByTrip_Id(UUID tripId);
}
