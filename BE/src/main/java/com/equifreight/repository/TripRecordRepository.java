package com.equifreight.repository;

import com.equifreight.entity.TripRecord;
import com.equifreight.entity.enums.TripRecordKind;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TripRecordRepository extends JpaRepository<TripRecord, UUID> {
    @EntityGraph(attributePaths = {"routeStop", "routeStop.place", "routeStop.borderCrossing", "conditionLogs", "conditionLogs.horse"})
    List<TripRecord> findByJob_IdOrderByOccurredAtAsc(UUID jobId);

    @EntityGraph(attributePaths = {"routeStop", "routeStop.place", "routeStop.borderCrossing", "conditionLogs", "conditionLogs.horse"})
    Optional<TripRecord> findByClientRef(UUID clientRef);

    /**
     * The newest record of one of {@code kinds}: the events that move the trip status.
     */
    Optional<TripRecord> findTopByJob_IdAndKindInOrderByOccurredAtDesc(UUID jobId, Collection<TripRecordKind> kinds);

    boolean existsByJob_IdAndKind(UUID jobId, TripRecordKind kind);
}
