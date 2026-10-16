package com.equifreight.repository;

import com.equifreight.entity.TripRecord;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TripRecordRepository extends JpaRepository<TripRecord, UUID> {
    @EntityGraph(attributePaths = {"routeStop", "routeStop.place", "routeStop.borderCrossing", "conditionLogs", "conditionLogs.horse"})
    List<TripRecord> findByJob_IdOrderByOccurredAtAsc(UUID jobId);

    @EntityGraph(attributePaths = {"routeStop", "routeStop.place", "routeStop.borderCrossing", "conditionLogs", "conditionLogs.horse"})
    Optional<TripRecord> findByClientRef(UUID clientRef);
}
