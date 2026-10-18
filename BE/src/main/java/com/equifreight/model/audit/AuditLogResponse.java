package com.equifreight.model.audit;

import com.equifreight.entity.enums.Channel;
import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

/**
 * One audit log entry as the logistics manager reads it (US-00-06). {@code before} and
 * {@code after} are the stored jsonb documents; {@code jobId} is set when {@code entityCode} is a
 * job code, so the entry can link to the job.
 */
public record AuditLogResponse(
        UUID id,
        Instant occurredAt,
        UUID actorId,
        String actorLabel,
        String actorRole,
        Channel channel,
        Instant deviceRecordedAt,
        String action,
        String summary,
        String entityType,
        UUID entityId,
        String entityCode,
        JsonNode before,
        JsonNode after,
        String reason,
        UUID jobId
) {
}
