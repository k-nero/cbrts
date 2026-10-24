package com.equifreight.repository;

import com.equifreight.entity.Incident;
import com.equifreight.entity.enums.IncidentStatus;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    Optional<Incident> findByClientRef(UUID clientRef);

    Page<Incident> findByStatusIn(Collection<IncidentStatus> statuses, Pageable pageable);
}
