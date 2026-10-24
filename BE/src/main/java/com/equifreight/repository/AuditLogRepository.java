package com.equifreight.repository;

import com.equifreight.entity.AuditLog;
import com.equifreight.model.audit.AuditActorOption;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

/** The append-only audit log (BR-F1-08). The same shape as on feat/flow-2-clearance, so the two merge. */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {

    Page<AuditLog> findByEntityCodeOrderByOccurredAtDesc(String entityCode, Pageable pageable);

    Page<AuditLog> findByEntityTypeOrderByOccurredAtDesc(String entityType, Pageable pageable);

    /** One entity's history, newest first (the Request review page). */
    List<AuditLog> findByEntityTypeAndEntityIdOrderByOccurredAtDesc(String entityType, UUID entityId);

    /** Several entities' histories, oldest first (an incident's timeline; a job's incidents). */
    List<AuditLog> findByEntityTypeAndEntityIdInOrderByOccurredAtAsc(String entityType, Collection<UUID> entityIds);

    /** One entity's rows of one action, oldest first (when each return for information happened). */
    List<AuditLog> findByEntityTypeAndEntityIdAndActionOrderByOccurredAtAsc(
            String entityType, UUID entityId, String action);

    /** Everyone with an account who has entries, once each; a renamed person shows one of their stored labels. */
    @Query("""
            select new com.equifreight.model.audit.AuditActorOption(a.actor.id, max(a.actorLabel), max(a.actorRole))
            from AuditLog a
            where a.actor is not null
            group by a.actor.id
            order by max(a.actorLabel)
            """)
    List<AuditActorOption> findActors();

    @Query("select distinct a.action from AuditLog a order by a.action")
    List<String> findActions();
}
