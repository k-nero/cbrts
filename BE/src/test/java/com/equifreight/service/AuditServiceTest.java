package com.equifreight.service;

import com.equifreight.entity.AuditLog;
import com.equifreight.entity.User;
import com.equifreight.repository.AuditLogRepository;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditService auditService;
    private JsonMapper jsonMapper;

    @BeforeEach
    void setUp() {
        jsonMapper = JsonMapper.builder().build();
        auditService = new AuditService(auditLogRepository, jsonMapper);
    }

    @Test
    @DisplayName("recordDecision wraps bare words in valid JSON for Postgres jsonb")
    void recordDecisionWrapsBareWordsInJson() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFirstName("Lan");
        user.setLastName("Nguyen");

        auditService.recordDecision(
                user,
                "DOCUMENT_APPROVED",
                "Approved passport",
                "DOCUMENT_VERSION",
                UUID.randomUUID(),
                "CBRT-2026-001",
                null,
                "PENDING",
                "APPROVED"
        );

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertNotNull(saved);
        // Bare words must be converted to valid JSON: {"status":"PENDING"}
        assertEquals("{\"status\":\"PENDING\"}", saved.getBefore());
        assertEquals("{\"status\":\"APPROVED\"}", saved.getAfter());
    }

    @Test
    @DisplayName("recordDecision preserves already valid JSON objects")
    void recordDecisionPreservesValidJson() {
        auditService.recordDecision(
                null,
                "CATALOG_PUBLISHED",
                "Published catalog",
                "REGULATION_VERSION",
                UUID.randomUUID(),
                "CAT-1",
                null,
                "{\"version\":1}",
                "{\"version\":2}"
        );

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertEquals("{\"version\":1}", saved.getBefore());
        assertEquals("{\"version\":2}", saved.getAfter());
    }
}
