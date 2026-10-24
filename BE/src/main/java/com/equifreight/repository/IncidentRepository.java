package com.equifreight.repository;

import com.equifreight.entity.Incident;
import com.equifreight.entity.enums.IncidentStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    Optional<Incident> findByClientRef(UUID clientRef);

    Page<Incident> findByStatusIn(Collection<IncidentStatus> statuses, Pageable pageable);

    /** Whether the job has an incident not yet resolved: it pauses the handover's default acceptance. */
    boolean existsByJob_IdAndStatusIn(UUID jobId, Collection<IncidentStatus> statuses);

    /** A job's incidents that stopped the arrival-window clock (a hold, a welfare stop). */
    List<Incident> findByJob_IdAndStopsClockTrue(UUID jobId);

    /** A job's incidents, oldest first, with the people named on them (the job's trip record, US-F5-05). */
    @EntityGraph(attributePaths = {"owner", "resolvedBy"})
    List<Incident> findByJob_IdOrderByOpenedAtAsc(UUID jobId);
}
