package com.equifreight.model.audit;

import com.equifreight.entity.AuditLog;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

public final class AuditMapper {

    private AuditMapper() {}

    /** An audit row; {@code before} and {@code after} are its stored JSON, parsed, and {@code jobId} the job its code names. */
    public static AuditLogResponse toResponse(AuditLog log, JsonNode before, JsonNode after, UUID jobId) {
        return new AuditLogResponse(
                log.getId(),
                log.getOccurredAt(),
                log.getActor() == null ? null : log.getActor().getId(),
                log.getActorLabel(),
                log.getActorRole(),
                log.getChannel(),
                log.getDeviceRecordedAt(),
                log.getAction(),
                log.getSummary(),
                log.getEntityType(),
                log.getEntityId(),
                log.getEntityCode(),
                before,
                after,
                log.getReason(),
                jobId);
    }
}
