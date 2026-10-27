package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.clearance.CatalogMoveRequest;
import com.equifreight.model.clearance.CatalogUpdateResponse;
import com.equifreight.repository.*;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CatalogUpdateServiceTest {

    @Mock
    private ClearanceService clearance;

    @Mock
    private TransportJobRepository jobs;

    @Mock
    private JobRegulationPinRepository pins;

    @Mock
    private RegulationVersionRepository versions;

    @Mock
    private RegulationRuleRepository rules;

    @Mock
    private ChecklistItemRepository items;

    @Mock
    private AuditService audit;

    @Mock
    private NotificationService notifications;

    @Spy
    private Clock clock = Clock.fixed(Instant.parse("2026-10-27T03:00:00Z"), BusinessTime.ZONE);

    @InjectMocks
    private CatalogUpdateService service;

    private TransportJob job;
    private RegulationVersion v2;
    private RegulationVersion v5;
    private JobRegulationPin pin;
    private DocumentType health;
    private DocumentType eia;
    private DocumentType passport;
    private DocumentType rabies;

    @BeforeEach
    void setUp() {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        TransportRequest request = new TransportRequest();
        request.setClub(club);
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-001");
        job.setRequest(request);

        Country hongKong = new Country();
        hongKong.setName("Hong Kong");
        RegulationCatalog catalog = new RegulationCatalog();
        catalog.setId(UUID.randomUUID());
        catalog.setCountry(hongKong);
        v2 = version(catalog, 2, CatalogStatus.RETIRED);
        v5 = version(catalog, 5, CatalogStatus.PUBLISHED);
        pin = new JobRegulationPin();
        pin.setJob(job);
        pin.setRegulationVersion(v2);
        pin.setRole(RegulationRole.DESTINATION);

        health = documentType("Export health certificate", DocumentProvider.CUSTOMER);
        eia = documentType("EIA (Coggins)", DocumentProvider.CUSTOMER);
        passport = documentType("Horse passport", DocumentProvider.CUSTOMER);
        rabies = documentType("Rabies vaccination", DocumentProvider.CUSTOMER);

        // v2 asks for the certificate, EIA within 60 days and the passport; v5 keeps the certificate, tightens EIA to
        // 45 days, drops the passport and adds rabies.
        lenient()
                .when(rules.findByVersionId(v2.getId()))
                .thenReturn(List.of(rule(v2, health, null), rule(v2, eia, (short) 60), rule(v2, passport, null)));
        lenient()
                .when(rules.findByVersionId(v5.getId()))
                .thenReturn(List.of(rule(v5, health, null), rule(v5, eia, (short) 45), rule(v5, rabies, null)));
        lenient().when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        lenient().when(pins.findByJobIdAndSupersededAtIsNull(job.getId())).thenReturn(List.of(pin));
    }

    @Test
    void aNewerPublishedVersionIsListedWithWhatItChanges() {
        when(versions.findByCatalogIdAndStatus(v2.getCatalog().getId(), CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v5));

        List<CatalogUpdateResponse> updates = service.updatesFor(job.getId());

        assertEquals(1, updates.size());
        CatalogUpdateResponse update = updates.getFirst();
        assertEquals("Hong Kong", update.country());
        assertEquals(2, update.pinnedVersionNo());
        assertEquals(5, update.versionNo());
        assertEquals(List.of("Rabies vaccination"), update.added());
        assertEquals(List.of("EIA (Coggins): within 60 d, mandatory → within 45 d, mandatory"), update.changed());
        assertEquals(List.of("Horse passport"), update.removed());
    }

    @Test
    void theVersionTheJobIsOnIsNoUpdate() {
        when(versions.findByCatalogIdAndStatus(v2.getCatalog().getId(), CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v2));

        assertTrue(service.updatesFor(job.getId()).isEmpty());
    }

    @Test
    void movingAddsRepointsAndDropsItemsKeepingTheOldPin() {
        RegulationRule eia45 = rule(v5, eia, (short) 45);
        RegulationRule health5 = rule(v5, health, null);
        RegulationRule rabies5 = rule(v5, rabies, null);
        ChecklistItem eiaItem = item(eia, rule(v2, eia, (short) 60));
        ChecklistItem passportItem = item(passport, rule(v2, passport, null));
        ChecklistItem healthItem = item(health, rule(v2, health, null));
        ChecklistItem rabiesItem = item(rabies, rabies5);
        when(versions.findById(v5.getId())).thenReturn(Optional.of(v5));
        when(clearance.governingRules(anyList())).thenReturn(List.of(health5, eia45, rabies5));
        when(items.findByJobId(job.getId())).thenReturn(List.of(eiaItem, passportItem, healthItem));
        when(clearance.missingItems(job, List.of(health5, eia45, rabies5), true))
                .thenReturn(List.of(rabiesItem));

        service.moveToVersion(job.getId(), new CatalogMoveRequest(v5.getId(), "Hong Kong added rabies"), null);

        ArgumentCaptor<JobRegulationPin> saved = ArgumentCaptor.forClass(JobRegulationPin.class);
        verify(pins, times(2)).save(saved.capture());
        assertEquals(clock.instant(), saved.getAllValues().get(0).getSupersededAt());
        assertSame(v2, saved.getAllValues().get(0).getRegulationVersion());
        assertSame(v5, saved.getAllValues().get(1).getRegulationVersion());
        assertNull(saved.getAllValues().get(1).getSupersededAt());
        assertEquals(RegulationRole.DESTINATION, saved.getAllValues().get(1).getRole());

        assertSame(eia45, eiaItem.getRegulationRule());
        assertSame(health5, healthItem.getRegulationRule());
        assertNull(eiaItem.getDroppedAt());
        assertEquals(clock.instant(), passportItem.getDroppedAt());
        assertNull(passportItem.getHolder());
        verify(items).saveAll(List.of(rabiesItem));
        verify(clearance).recheckJobDocuments(job.getId());
        verify(audit)
                .recordDecision(
                        isNull(),
                        eq("CATALOG_UPDATE_APPLIED"),
                        eq("Moved CBRT-2026-001 from Hong Kong v2 to Hong Kong v5: 1 added, 1 changed, 1 removed."),
                        eq("TRANSPORT_JOB"),
                        eq(job.getId()),
                        eq("CBRT-2026-001"),
                        eq("Hong Kong added rabies"),
                        eq("Hong Kong v2"),
                        eq("Hong Kong v5"));
        verify(notifications)
                .notify(eq(NotificationKind.DOCUMENTS_DUE), any(), any(), anyString(), contains("Rabies vaccination"));
    }

    @Test
    void aDocumentListedAgainComesBackFromDropped() {
        RegulationRule passport5 = rule(v5, passport, null);
        ChecklistItem passportItem = item(passport, rule(v2, passport, null));
        passportItem.setDroppedAt(Instant.parse("2026-10-01T00:00:00Z"));
        passportItem.setHolder(null);
        when(versions.findById(v5.getId())).thenReturn(Optional.of(v5));
        when(clearance.governingRules(anyList())).thenReturn(List.of(passport5));
        when(items.findByJobId(job.getId())).thenReturn(List.of(passportItem));

        service.moveToVersion(job.getId(), new CatalogMoveRequest(v5.getId(), "Passport is back"), null);

        assertNull(passportItem.getDroppedAt());
        assertSame(passport5, passportItem.getRegulationRule());
        assertEquals(ChecklistHolder.CUSTOMER, passportItem.getHolder());
    }

    @Test
    void aDepartedJobDoesNotMove() {
        when(clearance.frozen(job)).thenReturn(true);

        ConflictException e = assertThrows(
                ConflictException.class,
                () -> service.moveToVersion(job.getId(), new CatalogMoveRequest(v5.getId(), "late"), null));

        assertEquals("JOB_DEPARTED", e.getCode());
        verify(pins, never()).save(any());
    }

    @Test
    void aJobDoesNotMoveBackToAnOlderVersion() {
        pin.setRegulationVersion(v5);
        RegulationVersion v3 = version(v5.getCatalog(), 3, CatalogStatus.PUBLISHED);
        when(versions.findById(v3.getId())).thenReturn(Optional.of(v3));

        ConflictException e = assertThrows(
                ConflictException.class,
                () -> service.moveToVersion(job.getId(), new CatalogMoveRequest(v3.getId(), "older"), null));

        assertEquals("VERSION_NOT_NEWER", e.getCode());
        verify(pins, never()).save(any());
    }

    private static RegulationVersion version(RegulationCatalog catalog, int no, CatalogStatus status) {
        RegulationVersion v = new RegulationVersion();
        v.setId(UUID.randomUUID());
        v.setCatalog(catalog);
        v.setVersionNo(no);
        v.setStatus(status);
        return v;
    }

    private static DocumentType documentType(String name, DocumentProvider provider) {
        DocumentType t = new DocumentType();
        t.setId(UUID.randomUUID());
        t.setName(name);
        t.setScope(DocumentScope.PER_SHIPMENT);
        t.setProvidedBy(provider);
        return t;
    }

    private static RegulationRule rule(RegulationVersion version, DocumentType type, Short maxDays) {
        RegulationRule r = new RegulationRule();
        r.setId(UUID.randomUUID());
        r.setVersion(version);
        r.setDocumentType(type);
        r.setMandatory(true);
        r.setRuleKind(maxDays == null ? RegulationRuleKind.PRESENCE_ONLY : RegulationRuleKind.WINDOW_BEFORE_DEPARTURE);
        r.setMaxDays(maxDays);
        return r;
    }

    private ChecklistItem item(DocumentType type, RegulationRule rule) {
        ChecklistItem i = new ChecklistItem();
        i.setId(UUID.randomUUID());
        i.setJob(job);
        i.setDocumentType(type);
        i.setRegulationRule(rule);
        i.setStatus(ChecklistStatus.AWAITING_UPLOAD);
        i.setHolder(ChecklistHolder.CUSTOMER);
        return i;
    }
}
