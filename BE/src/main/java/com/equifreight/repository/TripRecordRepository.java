package com.equifreight.repository;

import com.equifreight.entity.TripRecord;
import com.equifreight.entity.enums.TripRecordKind;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripRecordRepository extends JpaRepository<TripRecord, UUID> {
    @EntityGraph(
            attributePaths = {
                "routeStop",
                "routeStop.place",
                "routeStop.borderCrossing",
                "conditionLogs",
                "conditionLogs.horse"
            })
    List<TripRecord> findByTrip_IdOrderByOccurredAtAsc(UUID tripId);

    @EntityGraph(
            attributePaths = {
                "routeStop",
                "routeStop.place",
                "routeStop.borderCrossing",
                "conditionLogs",
                "conditionLogs.horse"
            })
    Optional<TripRecord> findByClientRef(UUID clientRef);

    /**
     * The newest record of one of {@code kinds}: the events that move the trip status.
     */
    Optional<TripRecord> findTopByTrip_IdAndKindInOrderByOccurredAtDesc(UUID tripId, Collection<TripRecordKind> kinds);

    boolean existsByTrip_IdAndKind(UUID tripId, TripRecordKind kind);
}
