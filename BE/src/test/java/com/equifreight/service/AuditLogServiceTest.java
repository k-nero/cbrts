package com.equifreight.service;

import com.equifreight.entity.AuditLog;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.Channel;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.audit.AuditLogFilter;
import com.equifreight.model.audit.AuditLogResponse;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.TransportJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    private static final AuditLogFilter NO_FILTER = new AuditLogFilter(null, null, null, null, null);

    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private TransportJobRepository transportJobRepository;

    private AuditLogService service;

    private static AuditLog entry(String code) {
        AuditLog log = new AuditLog();
        log.setId(UUID.randomUUID());
        log.setOccurredAt(Instant.parse("2026-09-26T04:31:00Z"));
        log.setActorLabel("System");
        log.setActorRole("SYSTEM");
        log.setChannel(Channel.SYSTEM);
        log.setAction("DOCUMENT_REJECTED");
        log.setSummary("Summary");
        log.setEntityCode(code);
        return log;
    }

    @BeforeEach
    void setUp() {
        service = new AuditLogService(auditLogRepository, transportJobRepository, JsonMapper.builder().build());
    }

    @Test
    @DisplayName("A day in the date filter starts at midnight Indochina Time, not UTC")
    void dateFilterUsesBusinessDays() {
        assertEquals(Instant.parse("2026-10-16T17:00:00Z"), AuditLogService.dayStart(LocalDate.of(2026, 10, 17)));
    }

    @Test
    @DisplayName("A date range that starts after it ends is refused, naming both days")
    void reversedDateRangeIsRefused() {
        var filter = new AuditLogFilter(null, null, null, LocalDate.of(2026, 9, 26), LocalDate.of(2026, 9, 20));

        var e = assertThrows(BusinessException.class, () -> AuditLogService.toSpecification(filter));

        assertTrue(e.getMessage().contains("26 Sep 2026"), e.getMessage());
        assertTrue(e.getMessage().contains("20 Sep 2026"), e.getMessage());
    }

    @Test
    @DisplayName("A person filter that is neither a user id nor SYSTEM is refused")
    void unknownActorFilterIsRefused() {
        var filter = new AuditLogFilter(null, "Lan", null, null, null);

        assertThrows(BusinessException.class, () -> AuditLogService.toSpecification(filter));
    }

    @Test
    @DisplayName("The list is newest first by time, with the id breaking ties")
    void listDefaultsToNewestFirst() {
        Pageable sorted = AuditLogService.newestFirst(PageRequest.of(2, 20));

        assertEquals(2, sorted.getPageNumber());
        assertEquals(20, sorted.getPageSize());
        assertEquals(Sort.by(Sort.Direction.DESC, "occurredAt").and(Sort.by(Sort.Direction.DESC, "id")), sorted.getSort());
    }

    @Test
    @DisplayName("Oldest first is allowed on the When column")
    void oldestFirstIsAllowed() {
        Pageable sorted = AuditLogService.newestFirst(PageRequest.of(0, 20, Sort.by(Sort.Direction.ASC, "occurredAt")));

        assertEquals(Sort.Direction.ASC, sorted.getSort().getOrderFor("occurredAt").getDirection());
    }

    @Test
    @DisplayName("Sorting by any column other than When is refused")
    void sortingByAnotherColumnIsRefused() {
        var e = assertThrows(BusinessException.class,
                () -> AuditLogService.newestFirst(PageRequest.of(0, 20, Sort.by("action"))));

        assertTrue(e.getMessage().contains("action"), e.getMessage());
    }

    @Test
    @DisplayName("An entry on a job code links to that job; other codes have no link")
    @SuppressWarnings("unchecked")
    void jobCodesResolveToTheJob() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = new TransportJob();
        job.setId(jobId);
        job.setCode("CBRT-2026-041");
        AuditLog onJob = entry("CBRT-2026-041");
        AuditLog onRequest = entry("REQ-2026-0193");
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(onJob, onRequest)));
        when(transportJobRepository.findByCodeIn(Set.of("CBRT-2026-041"))).thenReturn(List.of(job));

        Page<AuditLogResponse> page = service.search(NO_FILTER, PageRequest.of(0, 20));

        assertEquals(jobId, page.getContent().get(0).jobId());
        assertNull(page.getContent().get(1).jobId());
    }

    @Test
    @DisplayName("A page without job codes doesn't look up jobs")
    @SuppressWarnings("unchecked")
    void noJobLookupWithoutJobCodes() {
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entry("Catalog KH v8"))));

        service.search(NO_FILTER, PageRequest.of(0, 20));

        verify(transportJobRepository, never()).findByCodeIn(anyCollection());
    }

    @Test
    @DisplayName("Before and after come back as JSON, not as strings")
    @SuppressWarnings("unchecked")
    void beforeAndAfterAreJson() {
        AuditLog log = entry("CBRT-2026-041");
        log.setBefore("{\"status\":\"PENDING\"}");
        log.setAfter("{\"status\":\"APPROVED\"}");
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log)));

        AuditLogResponse response = service.search(NO_FILTER, PageRequest.of(0, 20)).getContent().getFirst();

        assertEquals("PENDING", response.before().get("status").asString());
        assertEquals("APPROVED", response.after().get("status").asString());
    }

    @Test
    @DisplayName("An export over the limit is refused instead of being cut off")
    @SuppressWarnings("unchecked")
    void exportOverTheLimitIsRefused() {
        when(auditLogRepository.count(any(Specification.class))).thenReturn((long) AuditLogService.EXPORT_LIMIT + 1);

        var e = assertThrows(BusinessException.class, () -> service.exportCsv(NO_FILTER));

        assertTrue(e.getMessage().contains("5,001"), e.getMessage());
        verify(auditLogRepository, never()).findAll(any(Specification.class), any(Sort.class));
    }

    @Test
    @DisplayName("The export is CSV in Indochina Time with every cell quoted")
    @SuppressWarnings("unchecked")
    void exportWritesQuotedCsv() {
        User lan = new User();
        lan.setId(UUID.randomUUID());
        AuditLog log = entry("CBRT-2026-041");
        log.setActor(lan);
        log.setActorLabel("Nguyễn Thị Lan");
        log.setSummary("Rejected Silver Bell’s proof of ownership: \"the bill of sale is unsigned\"");
        log.setOccurredAt(Instant.parse("2026-09-24T09:02:00Z"));
        when(auditLogRepository.count(any(Specification.class))).thenReturn(1L);
        when(auditLogRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(log));

        String csv = new String(service.exportCsv(NO_FILTER), StandardCharsets.UTF_8);
        String[] lines = csv.split("\n");

        assertTrue(lines[0].startsWith("﻿When (ICT),Who,"), lines[0]);
        assertTrue(lines[1].startsWith("\"2026-09-24 16:02\",\"Nguyễn Thị Lan\","), lines[1]);
        assertTrue(lines[1].contains("\"\"the bill of sale is unsigned\"\""), lines[1]);
    }

    @Test
    @DisplayName("A cell that starts like a formula is defused for spreadsheets")
    void formulaCellsAreDefused() {
        assertEquals("\"'=HYPERLINK(\"\"x\"\")\"", AuditLogService.cell("=HYPERLINK(\"x\")"));
        assertEquals("", AuditLogService.cell(null));
    }
}
