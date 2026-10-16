package com.equifreight.service;

import com.equifreight.entity.AuditLog;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.Channel;
import com.equifreight.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Service to record append-only audit trail entries (BR-F1-08 / AGENTS.md).
 * Every decision and state change must write an audit log row in the same transaction.
 */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public AuditLog recordDecision(
            User actor,
            String action,
            String summary,
            String entityType,
            UUID entityId,
            String entityCode,
            String reason,
            String before,
            String after) {

        AuditLog log = new AuditLog();
        log.setOccurredAt(Instant.now());
        log.setActor(actor);
        log.setActorLabel(actor != null
                ? actor.getFirstName() + " " + actor.getLastName()
                : "System");
        log.setActorRole(actor != null && actor.getRoles() != null && !actor.getRoles().isEmpty()
                ? actor.getRoles().iterator().next().getName()
                : "SYSTEM");
        log.setChannel(Channel.WEB);
        log.setAction(action);
        log.setSummary(summary);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setEntityCode(entityCode);
        log.setReason(reason);
        log.setBefore(before);
        log.setAfter(after);

        return auditLogRepository.save(log);
    }
}
