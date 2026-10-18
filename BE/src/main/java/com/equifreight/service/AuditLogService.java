package com.equifreight.service;

import com.equifreight.configuration.AppConstants;
import com.equifreight.entity.AuditLog;
import com.equifreight.entity.TransportJob;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.audit.AuditActorOption;
import com.equifreight.model.audit.AuditLogFilter;
import com.equifreight.model.audit.AuditLogResponse;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.TransportJobRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Reads the audit log for the logistics manager (US-00-06). Entries are written by
 * {@link AuditService} in the transaction of each change; nothing here edits or deletes them.
 */
@Service
public class AuditLogService {

    /**
     * The only sortable column is When (DESIGN.md, Tables: "Audit log: When only").
     */
    static final String SORT_FIELD = "occurredAt";
    /**
     * An export larger than this has to be narrowed first, so it is never cut off silently.
     */
    static final int EXPORT_LIMIT = 5000;

    private static final String JOB_CODE_PREFIX = "CBRT-";
    private static final DateTimeFormatter CSV_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(AppConstants.BUSINESS_ZONE);
    private static final DateTimeFormatter DAY =
            DateTimeFormatter.ofPattern("d MMM yyyy").withZone(AppConstants.BUSINESS_ZONE);

    private final AuditLogRepository auditLogRepository;
    private final TransportJobRepository transportJobRepository;
    private final JsonMapper jsonMapper;

    public AuditLogService(AuditLogRepository auditLogRepository,
                           TransportJobRepository transportJobRepository,
                           JsonMapper jsonMapper) {
        this.auditLogRepository = auditLogRepository;
        this.transportJobRepository = transportJobRepository;
        this.jsonMapper = jsonMapper;
    }

    /**
     * Keeps paging but always sorts by time, newest first unless the caller asked for oldest first.
     * The id breaks ties: ids are UUIDv7, so they follow insertion order within one instant.
     */
    static Pageable newestFirst(Pageable pageable) {
        Sort.Direction direction = Sort.Direction.DESC;
        for (Sort.Order order : pageable.getSort()) {
            if (!SORT_FIELD.equals(order.getProperty())) {
                throw new BusinessException("The audit log sorts by time only (%s); '%s' can't be sorted. Search or filter by it instead."
                        .formatted(SORT_FIELD, order.getProperty()));
            }
            direction = order.getDirection();
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(direction, SORT_FIELD).and(Sort.by(direction, "id")));
    }

    private static Sort sortNewestFirst() {
        return Sort.by(Sort.Direction.DESC, SORT_FIELD).and(Sort.by(Sort.Direction.DESC, "id"));
    }

    /**
     * Validates the filters, then builds the query; the date range covers whole business days.
     */
    static Specification<AuditLog> toSpecification(AuditLogFilter filter) {
        if (filter.from() != null && filter.to() != null && filter.from().isAfter(filter.to())) {
            throw new BusinessException("The date range starts on %s, after it ends on %s. Pick a start on or before the end."
                    .formatted(DAY.format(filter.from().atStartOfDay(AppConstants.BUSINESS_ZONE)),
                            DAY.format(filter.to().atStartOfDay(AppConstants.BUSINESS_ZONE))));
        }
        UUID actorId = actorId(filter.actor());
        Instant fromInstant = filter.from() == null ? null : dayStart(filter.from());
        Instant toInstant = filter.to() == null ? null : dayStart(filter.to().plusDays(1));

        return (root, cq, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (filter.q() != null && !filter.q().isBlank()) {
                String like = "%" + filter.q().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("entityCode")), like),
                        cb.like(cb.lower(root.get("actorLabel")), like),
                        cb.like(cb.lower(root.get("summary")), like)));
            }
            if (AuditLogFilter.SYSTEM_ACTOR.equals(filter.actor())) {
                predicates.add(cb.isNull(root.get("actor")));
            } else if (actorId != null) {
                predicates.add(cb.equal(root.get("actor").get("id"), actorId));
            }
            if (filter.action() != null && !filter.action().isBlank()) {
                predicates.add(cb.equal(root.get("action"), filter.action()));
            }
            if (fromInstant != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), fromInstant));
            }
            if (toInstant != null) {
                predicates.add(cb.lessThan(root.get("occurredAt"), toInstant));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Midnight at the start of a business day: 17 Oct is from 16 Oct 17:00 UTC (AGENTS.md, Dates).
     */
    static Instant dayStart(LocalDate day) {
        return day.atStartOfDay(AppConstants.BUSINESS_ZONE).toInstant();
    }

    private static UUID actorId(String actor) {
        if (actor == null || actor.isBlank() || AuditLogFilter.SYSTEM_ACTOR.equals(actor)) {
            return null;
        }
        try {
            return UUID.fromString(actor);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("The person filter takes a user id or %s; got '%s'."
                    .formatted(AuditLogFilter.SYSTEM_ACTOR, actor));
        }
    }

    /**
     * RFC 4180: quote every cell, double the quotes inside. A leading =, +, - or @ is defused for spreadsheets.
     */
    static String cell(String value) {
        if (value == null) {
            return "";
        }
        String safe = !value.isEmpty() && "=+-@".indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
        return '"' + safe.replace("\"", "\"\"") + '"';
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(AuditLogFilter filter, Pageable pageable) {
        Specification<AuditLog> spec = toSpecification(filter);
        Page<AuditLog> page = auditLogRepository.findAll(spec, newestFirst(pageable));
        Map<String, UUID> jobIds = jobIdsByCode(page.getContent());
        return page.map(log -> toResponse(log, jobIds));
    }

    @Transactional(readOnly = true)
    public List<AuditActorOption> actors() {
        return auditLogRepository.findActors();
    }

    @Transactional(readOnly = true)
    public List<String> actions() {
        return auditLogRepository.findActions();
    }

    /**
     * The filtered entries as UTF-8 CSV (with a BOM, so spreadsheet apps keep the Vietnamese names).
     */
    @Transactional(readOnly = true)
    public byte[] exportCsv(AuditLogFilter filter) {
        Specification<AuditLog> spec = toSpecification(filter);
        long count = auditLogRepository.count(spec);
        if (count > EXPORT_LIMIT) {
            throw new BusinessException("An export holds at most %,d entries; these filters match %,d. Narrow the dates or pick a person or an action, then export again."
                    .formatted(EXPORT_LIMIT, count));
        }
        List<AuditLog> logs = auditLogRepository.findAll(spec, sortNewestFirst());
        StringBuilder csv = new StringBuilder("﻿");
        csv.append("When (ICT),Who,Role,Action,Summary,On,From,Recorded on device (ICT),Reason,Entry\n");
        for (AuditLog log : logs) {
            csv.append(String.join(",",
                    cell(CSV_TIME.format(log.getOccurredAt())),
                    cell(log.getActorLabel()),
                    cell(log.getActorRole()),
                    cell(log.getAction()),
                    cell(log.getSummary()),
                    cell(log.getEntityCode()),
                    cell(log.getChannel().name()),
                    cell(log.getDeviceRecordedAt() == null ? null : CSV_TIME.format(log.getDeviceRecordedAt())),
                    cell(log.getReason()),
                    cell(log.getId().toString())));
            csv.append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * One query for the page: the job ids behind the entity codes that are job codes.
     */
    private Map<String, UUID> jobIdsByCode(List<AuditLog> logs) {
        var codes = logs.stream()
                .map(AuditLog::getEntityCode)
                .filter(code -> code != null && code.startsWith(JOB_CODE_PREFIX))
                .collect(Collectors.toSet());
        if (codes.isEmpty()) {
            return Map.of();
        }
        return transportJobRepository.findByCodeIn(codes).stream()
                .collect(Collectors.toMap(TransportJob::getCode, TransportJob::getId));
    }

    private AuditLogResponse toResponse(AuditLog log, Map<String, UUID> jobIds) {
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
                json(log.getBefore()),
                json(log.getAfter()),
                log.getReason(),
                log.getEntityCode() == null ? null : jobIds.get(log.getEntityCode()));
    }

    private JsonNode json(String raw) {
        return raw == null ? null : jsonMapper.readTree(raw);
    }
}
