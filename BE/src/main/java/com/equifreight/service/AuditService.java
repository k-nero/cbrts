package com.equifreight.service;

import com.equifreight.entity.AuditLog;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.Channel;
import com.equifreight.repository.AuditLogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Service to record append-only audit trail entries (BR-F1-08 / AGENTS.md).
 * Every decision and state change must write an audit log row in the same transaction.
 * Before/after attributes are strictly serialized into valid JSON for Postgres jsonb columns.
 */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
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
        log.setBefore(toJson(before));
        log.setAfter(toJson(after));

        return auditLogRepository.save(log);
    }

    /**
     * Serializes any raw string or state label to a valid JSON document (e.g. {"status":"PENDING"}),
     * preventing Postgres jsonb parse failures on bare words.
     */
    private String toJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            return trimmed;
        }
        try {
            return objectMapper.writeValueAsString(Map.of("status", trimmed));
        } catch (JsonProcessingException e) {
            return "{\"status\":\"" + trimmed.replace("\"", "\\\"") + "\"}";
        }
    }
}
