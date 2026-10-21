package com.equifreight.service;

import com.equifreight.entity.AuditLog;
import com.equifreight.entity.Club;
import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.Channel;
import com.equifreight.repository.AuditLogRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/**
 * Writes the audit trail (BR-F1-08): one row per decision, in the caller's transaction. The class and
 * {@link #recordDecision} match the writer on feat/flow-2-clearance, so the two branches keep one copy.
 */
@Service
public class AuditService {

    private static final String SYSTEM = "System";
    private static final String SYSTEM_ROLE = "SYSTEM";

    private final AuditLogRepository logs;
    private final ClubService clubs;
    private final JsonMapper json;
    private final Clock clock;

    public AuditService(AuditLogRepository logs, ClubService clubs, JsonMapper json, Clock clock) {
        this.logs = logs;
        this.clubs = clubs;
        this.json = json;
        this.clock = clock;
    }

    /**
     * A person's decision, made on the web. A customer is labelled with the club's name ("Saigon Turf Club"),
     * staff with their own name; the label is kept even if the account is renamed later.
     */
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
        AuditLog log = base(action, summary, entityType, entityId, entityCode, before, after);
        log.setActor(actor);
        log.setActorLabel(actor == null ? SYSTEM : labelOf(actor));
        log.setActorRole(actor == null ? SYSTEM_ROLE : roleOf(actor));
        log.setChannel(Channel.WEB);
        log.setReason(reason);
        return logs.save(log);
    }

    /**
     * A person's record made on a device that may have been offline, such as the cab tablet: the row keeps
     * the device's own time next to the server's, so a late sync shows as one.
     */
    @Transactional
    public AuditLog recordFromDevice(
            User actor,
            Channel channel,
            Instant deviceRecordedAt,
            String action,
            String summary,
            String entityType,
            UUID entityId,
            String entityCode,
            Map<String, ?> after) {
        AuditLog log = base(action, summary, entityType, entityId, entityCode, null, null);
        log.setAfter(after == null ? null : json.writeValueAsString(after));
        log.setActor(actor);
        log.setActorLabel(labelOf(actor));
        log.setActorRole(roleOf(actor));
        log.setChannel(channel);
        log.setDeviceRecordedAt(deviceRecordedAt);
        return logs.save(log);
    }

    /** A check or change the system made on its own ("Lead time checked: …"). */
    @Transactional(readOnly = true)
    public boolean hasAction(String entityType, UUID entityId, String action) {
        return !logs.findByEntityTypeAndEntityIdAndActionOrderByOccurredAtAsc(entityType, entityId, action)
                .isEmpty();
    }

    @Transactional
    public AuditLog recordSystem(
            String action,
            String summary,
            String entityType,
            UUID entityId,
            String entityCode,
            String before,
            String after) {
        AuditLog log = base(action, summary, entityType, entityId, entityCode, before, after);
        log.setActorLabel(SYSTEM);
        log.setActorRole(SYSTEM_ROLE);
        log.setChannel(Channel.SYSTEM);
        return logs.save(log);
    }

    private AuditLog base(
            String action,
            String summary,
            String entityType,
            UUID entityId,
            String entityCode,
            String before,
            String after) {
        AuditLog log = new AuditLog();
        log.setOccurredAt(Instant.now(clock));
        log.setAction(action);
        log.setSummary(truncate(summary, 500));
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setEntityCode(entityCode);
        log.setBefore(toJson(before));
        log.setAfter(toJson(after));
        return log;
    }

    /** A summary is built by the code, so an over-long one is cut rather than failing the decision it records. */
    private static String truncate(String text, int max) {
        if (text == null || text.length() <= max) {
            return text;
        }
        return text.substring(0, max - 3) + "...";
    }

    private String labelOf(User actor) {
        return clubs.findClub(actor).map(Club::getName).orElseGet(actor::displayName);
    }

    private static String roleOf(User actor) {
        return actor.getRoles().stream()
                .map(Role::getName)
                .min(Comparator.naturalOrder())
                .orElse(null);
    }

    /** JSON is kept as given; a bare value such as "DRAFT" becomes {"status":"DRAFT"} for the jsonb column. */
    private String toJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            return trimmed;
        }
        return json.writeValueAsString(Map.of("status", trimmed));
    }
}
