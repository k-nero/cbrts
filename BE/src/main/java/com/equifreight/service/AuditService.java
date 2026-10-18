package com.equifreight.service;

import com.equifreight.entity.AuditLog;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.Channel;
import com.equifreight.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

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
    /**
     * Spring Boot 4 auto-configures Jackson 3's JsonMapper; there is no Jackson 2 ObjectMapper bean.
     */
    private final JsonMapper jsonMapper;

    public AuditService(AuditLogRepository auditLogRepository, JsonMapper jsonMapper) {
        this.auditLogRepository = auditLogRepository;
        this.jsonMapper = jsonMapper;
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
                ? actor.displayName()
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
        return jsonMapper.writeValueAsString(Map.of("status", trimmed));
    }
}
