package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.*;
import com.equifreight.entity.Country;
import com.equifreight.entity.JobRegulationPin;
import com.equifreight.entity.enums.*;
import com.equifreight.entity.enums.RegulationRole;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.ChecklistItemResponse;
import com.equifreight.model.clearance.ClearanceStatusResponse;
import com.equifreight.model.clearance.DocumentCheckRequest;
import com.equifreight.model.clearance.DocumentCheckResponse;
import com.equifreight.model.clearance.DocumentUploadRequest;
import com.equifreight.model.clearance.ReviewDocumentRequest;
import com.equifreight.repository.*;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ClearanceServiceTest {

    @Mock
    private JobTripService jobTrips;

    @Mock
    private ChecklistItemRepository checklistItemRepository;

    @Mock
    private DocumentVersionRepository documentVersionRepository;

    @Mock
    private TransportJobRepository transportJobRepository;

    @Mock
    private QuarantinePeriodRepository quarantinePeriodRepository;

    @Mock
    private AuthoritySubmissionRepository authoritySubmissionRepository;

    @Mock
    private ValidityEngine validityEngine;

    @Mock
    private AuditService auditService;

    @Mock
    private FileService fileService;

    @Mock
    private JobRegulationPinRepository jobRegulationPinRepository;

    @Mock
    private RegulationCatalogRepository regulationCatalogRepository;

    @Mock
    private RegulationVersionRepository regulationVersionRepository;

    @Mock
    private RegulationRuleRepository regulationRuleRepository;

    // 23 Oct 2026, 10:00 in Ho Chi Minh City.
    @Spy
    private Clock clock = Clock.fixed(Instant.parse("2026-10-23T03:00:00Z"), BusinessTime.ZONE);

    @InjectMocks
    private ClearanceService clearanceService;

    private User specialistUser;
    private TransportJob job;
    private ChecklistItem checklistItem;
    private DocumentVersion documentVersion;

    private static Authority authority(String name) {
        Authority authority = new Authority();
        authority.setId(UUID.randomUUID());
        authority.setName(name);
        return authority;
    }

    private static AuthoritySubmission submission(Authority authority, SubmissionStatus status, Instant filedAt) {
        AuthoritySubmission submission = new AuthoritySubmission();
        submission.setId(UUID.randomUUID());
        submission.setAuthority(authority);
        submission.setKind(SubmissionKind.IMPORT_PERMIT);
        submission.setStatus(status);
        submission.setFiledAt(filedAt);
        return submission;
    }

    @BeforeEach
    void setUp() {
        Role specialistRole = new Role();
        specialistRole.setName(RoleName.TRANSPORT_SPECIALIST);

        specialistUser = new User();
        specialistUser.setId(UUID.randomUUID());
        specialistUser.setFirstName("Lan");
        specialistUser.setLastName("Nguyen");
        specialistUser.setEmail("lan.nguyen@equifreight.vn");
        specialistUser.setRoles(Set.of(specialistRole));

        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-001");
        job.setDossierStatus(DossierStatus.OPEN);
        job.setStage(JobStage.DOCUMENTS);

        DocumentType docType = new DocumentType();
        docType.setId(UUID.randomUUID());
        docType.setCode("EQUINE_PASSPORT");
        docType.setName("Equine passport");

        checklistItem = new ChecklistItem();
        checklistItem.setId(UUID.randomUUID());
        checklistItem.setJob(job);
        checklistItem.setDocumentType(docType);
        checklistItem.setStatus(ChecklistStatus.IN_REVIEW);
        checklistItem.setValidity(Validity.GREEN);

        documentVersion = new DocumentVersion();
        documentVersion.setId(UUID.randomUUID());
        documentVersion.setChecklistItem(checklistItem);
        documentVersion.setVersionNo((short) 1);
        documentVersion.setReview(DocumentReview.PENDING);

        checklistItem.setCurrentVersion(documentVersion);
    }

    @Test
    @DisplayName("reviewDocument rejects re-reviewing an already reviewed version")
    void reviewDocumentThrowsWhenNotPending() {
        documentVersion.setReview(DocumentReview.APPROVED);
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));

        ReviewDocumentRequest req = ReviewDocumentRequest.builder()
                .review(DocumentReview.REJECTED)
                .rejectReason("Sample is blurred")
                .build();

        assertThrows(
                ConflictException.class,
                () -> clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument rejects when reviewing a superseded version (Finding 3)")
    void reviewDocumentThrowsWhenVersionIsSuperseded() {
        DocumentVersion v2 = new DocumentVersion();
        v2.setId(UUID.randomUUID());
        v2.setVersionNo((short) 2);
        checklistItem.setCurrentVersion(v2);

        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));

        ReviewDocumentRequest req =
                ReviewDocumentRequest.builder().review(DocumentReview.APPROVED).build();

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        assertEquals("VERSION_SUPERSEDED", ex.getCode());
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument rejects invalid review decisions like PENDING (Finding 6)")
    void reviewDocumentThrowsWhenReviewDecisionIsPending() {
        ReviewDocumentRequest req =
                ReviewDocumentRequest.builder().review(DocumentReview.PENDING).build();

        assertThrows(
                BusinessException.class,
                () -> clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument requires a rejection reason when rejecting a version")
    void reviewDocumentThrowsWhenRejectionReasonMissing() {
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));

        ReviewDocumentRequest req = ReviewDocumentRequest.builder()
                .review(DocumentReview.REJECTED)
                .rejectReason("   ")
                .build();

        assertThrows(
                BusinessException.class,
                () -> clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument refuses approval when validity is RED before writing to database")
    void reviewDocumentRefusesApprovalWhenValidityIsRed() {
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));
        when(validityEngine.evaluate(any(), any(), any(), any()))
                .thenReturn(new ValidityEngine.Result(Validity.RED, "Sampling date expired 65 days before departure."));

        ReviewDocumentRequest req =
                ReviewDocumentRequest.builder().review(DocumentReview.APPROVED).build();

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        assertTrue(ex.getMessage().contains("RED cannot be approved"));
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument approves version, marks item CLEARED, and audits decision")
    void reviewDocumentApprovesSuccessfully() {
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));
        when(documentVersionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(checklistItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(validityEngine.evaluate(any(), any(), any(), any()))
                .thenReturn(new ValidityEngine.Result(Validity.GREEN, "Valid document."));

        ReviewDocumentRequest req =
                ReviewDocumentRequest.builder().review(DocumentReview.APPROVED).build();

        clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser);

        assertEquals(DocumentReview.APPROVED, documentVersion.getReview());
        assertEquals(specialistUser, documentVersion.getReviewedBy());
        assertEquals(ChecklistStatus.CLEARED, checklistItem.getStatus());
        assertNull(checklistItem.getHolder());

        verify(auditService)
                .recordDecision(
                        eq(specialistUser),
                        eq("DOCUMENT_APPROVED"),
                        contains("Approved Equine passport"),
                        eq("DOCUMENT_VERSION"),
                        eq(documentVersion.getId()),
                        eq(job.getCode()),
                        isNull(),
                        eq("PENDING"),
                        eq("APPROVED"));
    }

    @Test
    @DisplayName("uploadDocumentVersion refuses RED validity before saving anything (Finding 8)")
    void uploadDocumentVersionRefusesRedBeforeSave() {
        UUID fileId = UUID.randomUUID();
        StoredFile file = new StoredFile();
        file.setId(fileId);

        when(checklistItemRepository.findById(checklistItem.getId())).thenReturn(Optional.of(checklistItem));
        when(fileService.requireAttachable(fileId, specialistUser)).thenReturn(file);
        when(validityEngine.evaluate(any(), any(), any(), any()))
                .thenReturn(new ValidityEngine.Result(Validity.RED, "Booster vaccination out of window."));

        DocumentUploadRequest req = DocumentUploadRequest.builder()
                .fileId(fileId)
                .issuedOn(LocalDate.of(2026, 1, 1))
                .validUntil(LocalDate.of(2026, 2, 1))
                .issuer("DAH Vietnam")
                .build();

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> clearanceService.uploadDocumentVersion(checklistItem.getId(), req, specialistUser));
        assertEquals("DOCUMENT_VALIDITY_RED", ex.getCode());
        verify(documentVersionRepository, never()).save(any());
        verify(auditService, never()).recordDecision(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("evaluateClearanceGate opens gate when all mandatory items are CLEARED, GREEN, and submissions ISSUED")
    void evaluateClearanceGateReadyWhenAllCleared() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);

        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of());

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertTrue(resp.clearanceReady());
        assertEquals(DossierStatus.CLEARANCE_READY, resp.dossierStatus());
        assertEquals(JobStage.CLEARANCE, job.getStage());
        assertNotNull(job.getClearanceReadyAt());

        verify(transportJobRepository).save(job);
        verify(auditService)
                .recordDecision(
                        isNull(),
                        eq("CLEARANCE_GATE_PASSED"),
                        contains("CLEARANCE_READY"),
                        eq("TRANSPORT_JOB"),
                        eq(job.getId()),
                        eq(job.getCode()),
                        isNull(),
                        eq("OPEN"),
                        eq("CLEARANCE_READY"));
    }

    @Test
    @DisplayName("#113: a job pinned to a version with no document rules never clears, and the gate says why")
    void anEmptyChecklistNeverClearsTheGate() {
        RegulationVersion version = cambodiaCatalog();
        Country cambodia = new Country();
        cambodia.setName("Cambodia");
        version.getCatalog().setCountry(cambodia);
        version.setVersionNo(7);
        JobRegulationPin pin = new JobRegulationPin();
        pin.setRole(RegulationRole.DESTINATION);
        pin.setRegulationVersion(version);
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(jobRegulationPinRepository.findByJobIdAndSupersededAtIsNull(job.getId()))
                .thenReturn(List.of(pin));

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertFalse(resp.clearanceReady());
        assertEquals(DossierStatus.OPEN, job.getDossierStatus());
        assertNull(job.getClearanceReadyAt());
        assertEquals(
                List.of("The pinned regulation catalog, Cambodia v7, has no mandatory document rules, so the gate"
                        + " stays closed until the job's checklist has its documents."),
                resp.outstandingIssues());
    }

    @Test
    @DisplayName("A job with no checklist yet says so")
    void aJobWithNoChecklistSaysSo() {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of());

        ClearanceStatusResponse resp = clearanceService.getClearanceStatus(job.getId());

        assertFalse(resp.clearanceReady());
        assertEquals(
                List.of("The job has no document checklist yet. Generate it from the regulation catalogs."),
                resp.outstandingIssues());
    }

    @Test
    @DisplayName("evaluateClearanceGate refuses gate when authority submission is REFUSED (Finding 5)")
    void evaluateClearanceGateBlocksWhenSubmissionRefused() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);

        Authority authority = new Authority();
        authority.setName("Customs Department");

        AuthoritySubmission refused = new AuthoritySubmission();
        refused.setAuthority(authority);
        refused.setKind(SubmissionKind.IMPORT_PERMIT);
        refused.setStatus(SubmissionStatus.REFUSED);

        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of(refused));

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertFalse(resp.clearanceReady());
        assertNotEquals(DossierStatus.CLEARANCE_READY, resp.dossierStatus());
        assertTrue(resp.outstandingIssues().contains("Import permit refused by Customs Department"));
        // The gate's sentences are read as written: no raw enum names.
        assertTrue(resp.outstandingIssues().stream().noneMatch(i -> i.matches(".*\\b[A-Z]+_[A-Z_]+\\b.*")));
    }

    @Test
    @DisplayName("evaluateClearanceGate does not mutate job after departure (Finding 2)")
    void evaluateClearanceGateReturnsEarlyAfterDeparture() {
        job.setDepartedAt(Instant.now());
        job.setDossierStatus(DossierStatus.CLEARANCE_READY);
        job.setStage(JobStage.TRIP);

        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of());

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertEquals(JobStage.TRIP, job.getStage());
        verify(transportJobRepository, never()).save(any());
        verify(auditService, never()).recordDecision(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName(
            "evaluateClearanceGate passes when a refused filing was re-filed and issued (latest per authority and kind)")
    void evaluateClearanceGateCountsOnlyTheLatestSubmission() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);
        Authority customs = authority("Cambodia customs");

        stubGate(List.of(
                submission(customs, SubmissionStatus.REFUSED, Instant.parse("2026-10-01T02:00:00Z")),
                submission(customs, SubmissionStatus.ISSUED, Instant.parse("2026-10-03T02:00:00Z"))));

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertTrue(resp.clearanceReady());
        assertEquals(DossierStatus.CLEARANCE_READY, job.getDossierStatus());
    }

    @Test
    @DisplayName("evaluateClearanceGate blocks when the latest filing was refused after an earlier one was issued")
    void evaluateClearanceGateBlocksWhenTheLatestSubmissionIsRefused() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);
        Authority customs = authority("Cambodia customs");

        stubGate(List.of(
                submission(customs, SubmissionStatus.ISSUED, Instant.parse("2026-10-01T02:00:00Z")),
                submission(customs, SubmissionStatus.REFUSED, Instant.parse("2026-10-03T02:00:00Z"))));

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertFalse(resp.clearanceReady());
        assertEquals(DossierStatus.OPEN, job.getDossierStatus());
    }

    @Test
    @DisplayName("evaluateClearanceGate derives ADDITIONAL_INFO_REQUIRED from an open info request")
    void evaluateClearanceGateSetsAdditionalInfoRequired() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);

        stubGate(List.of(submission(
                authority("DAH Vietnam"), SubmissionStatus.ADDITIONAL_INFO, Instant.parse("2026-10-02T02:00:00Z"))));

        clearanceService.evaluateClearanceGate(job.getId());

        assertEquals(DossierStatus.ADDITIONAL_INFO_REQUIRED, job.getDossierStatus());
        assertNull(job.getClearanceReadyAt());
    }

    /** A job to Cambodia with two horses. */
    private void routeToCambodia() {
        Country cambodia = new Country();
        cambodia.setId(UUID.randomUUID());
        cambodia.setCode("KH");
        cambodia.setName("Cambodia");
        Place phnomPenh = new Place();
        phnomPenh.setCountry(cambodia);
        TransportRequest request = new TransportRequest();
        request.setDestinationPlace(phnomPenh);
        for (String name : List.of("Shadowfax", "Nightfall")) {
            Horse horse = new Horse();
            horse.setId(UUID.randomUUID());
            horse.setName(name);
            RequestHorse rh = new RequestHorse();
            rh.setHorse(horse);
            request.getHorses().add(rh);
        }
        job.setRequest(request);
    }

    /** A version of Cambodia's catalog with a 21-day lead time; nothing is stubbed. */
    private static RegulationVersion cambodiaCatalog() {
        RegulationCatalog catalog = new RegulationCatalog();
        catalog.setId(UUID.randomUUID());
        catalog.setName("Cambodia");
        RegulationVersion version = new RegulationVersion();
        version.setId(UUID.randomUUID());
        version.setCatalog(catalog);
        version.setLeadTimeDays((short) 21);
        return version;
    }

    /** Cambodia's catalog, with that version published. */
    private RegulationVersion publishedCambodiaCatalog() {
        RegulationVersion version = cambodiaCatalog();
        when(regulationCatalogRepository.findByCountryCode("KH")).thenReturn(Optional.of(version.getCatalog()));
        when(regulationVersionRepository.findByCatalogIdAndStatus(
                        version.getCatalog().getId(), CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(version));
        return version;
    }

    private static RegulationRule rule(RegulationVersion version, DocumentScope scope, DocumentProvider provider) {
        DocumentType type = new DocumentType();
        type.setId(UUID.randomUUID());
        type.setScope(scope);
        type.setProvidedBy(provider);
        RegulationRule rule = new RegulationRule();
        rule.setVersion(version);
        rule.setDocumentType(type);
        return rule;
    }

    @SuppressWarnings("unchecked")
    private List<ChecklistItem> savedItems() {
        org.mockito.ArgumentCaptor<List<ChecklistItem>> items = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(checklistItemRepository).saveAll(items.capture());
        return items.getValue();
    }

    @Test
    @DisplayName("Generating a checklist pins the destination catalog and adds an item per horse and per shipment")
    void generateChecklistAddsItemsFromThePinnedCatalog() {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        routeToCambodia();
        RegulationVersion version = publishedCambodiaCatalog();
        RegulationRule passport = rule(version, DocumentScope.PER_HORSE, DocumentProvider.CUSTOMER);
        RegulationRule permit = rule(version, DocumentScope.PER_SHIPMENT, DocumentProvider.AUTHORITY);
        when(jobRegulationPinRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(regulationRuleRepository.findByVersionIdIn(Set.of(version.getId())))
                .thenReturn(List.of(passport, permit));
        // 08:00 on 15 Dec in Vietnam: the departure day is 15 Dec, so items are due 21 days earlier.
        job.setPlannedDepartureAt(Instant.parse("2026-12-15T01:00:00Z"));

        clearanceService.generateChecklist(job.getId(), specialistUser);

        List<ChecklistItem> items = savedItems();
        assertEquals(3, items.size());
        assertEquals(
                2, items.stream().filter(i -> i.getRegulationRule() == passport).count());
        ChecklistItem permitItem = items.stream()
                .filter(i -> i.getRegulationRule() == permit)
                .findFirst()
                .orElseThrow();
        assertNull(permitItem.getHorse());
        assertEquals(ChecklistStatus.NOT_ISSUED, permitItem.getStatus());
        assertEquals(ChecklistHolder.SPECIALIST, permitItem.getHolder());
        ChecklistItem passportItem = items.stream()
                .filter(i -> i.getRegulationRule() == passport)
                .findFirst()
                .orElseThrow();
        assertEquals(ChecklistStatus.AWAITING_UPLOAD, passportItem.getStatus());
        assertEquals(ChecklistHolder.CUSTOMER, passportItem.getHolder());
        assertEquals(LocalDate.of(2026, 11, 24), passportItem.getDueDate());
        verify(auditService)
                .recordDecision(
                        eq(specialistUser),
                        eq("CHECKLIST_GENERATED"),
                        anyString(),
                        eq("TRANSPORT_JOB"),
                        eq(job.getId()),
                        eq(job.getCode()),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    @DisplayName("A re-run adds only the missing items, and without a planned departure no due date is guessed")
    void generateChecklistAddsOnlyMissingItemsAndLeavesDueDateEmptyWithoutDeparture() {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        routeToCambodia();
        RegulationVersion version = cambodiaCatalog();
        RegulationRule passport = rule(version, DocumentScope.PER_HORSE, DocumentProvider.CUSTOMER);
        JobRegulationPin pin = new JobRegulationPin();
        pin.setRole(RegulationRole.DESTINATION);
        pin.setRegulationVersion(version);
        when(jobRegulationPinRepository.findByJobIdAndSupersededAtIsNull(job.getId()))
                .thenReturn(List.of(pin));
        when(jobRegulationPinRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(regulationRuleRepository.findByVersionIdIn(Set.of(version.getId())))
                .thenReturn(List.of(passport));
        ChecklistItem existing = new ChecklistItem();
        existing.setDocumentType(passport.getDocumentType());
        existing.setHorse(job.getRequest().getHorses().getFirst().getHorse());
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(existing));

        clearanceService.generateChecklist(job.getId(), specialistUser);

        List<ChecklistItem> items = savedItems();
        assertEquals(1, items.size(), "the first horse already has its passport item");
        assertEquals(
                job.getRequest().getHorses().get(1).getHorse(), items.getFirst().getHorse());
        assertNull(items.getFirst().getDueDate());
        verify(regulationCatalogRepository, never()).findByCountryCode(any());
    }

    @Test
    @DisplayName("Generating a checklist refuses a destination with no country instead of guessing one")
    void generateChecklistRefusesWithoutDestinationCountry() {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        job.setRequest(new TransportRequest());

        BusinessException e = assertThrows(
                BusinessException.class, () -> clearanceService.generateChecklist(job.getId(), specialistUser));

        assertEquals("CHECKLIST_NO_DESTINATION", e.getCode());
        verify(jobRegulationPinRepository, never()).saveAll(anyList());
        verify(checklistItemRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("Generating a checklist refuses a destination with no published catalog, before pinning anything")
    void generateChecklistRefusesWithoutPublishedCatalog() {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        routeToCambodia();
        RegulationCatalog draftOnly = cambodiaCatalog().getCatalog();
        when(regulationCatalogRepository.findByCountryCode("KH")).thenReturn(Optional.of(draftOnly));

        BusinessException e = assertThrows(
                BusinessException.class, () -> clearanceService.generateChecklist(job.getId(), specialistUser));

        assertEquals("CHECKLIST_NO_CATALOG", e.getCode());
        verify(jobRegulationPinRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("The gate's audit reason keeps whole issues within 500 characters and counts the rest")
    void issuesTextFitsTheAuditReasonColumn() {
        List<String> issues = java.util.stream.IntStream.range(0, 20)
                .mapToObj(i -> "Export health certificate for horse " + i + " is not uploaded")
                .toList();

        String text = ClearanceService.issuesText(issues);

        assertTrue(text.length() <= 500, text.length() + " characters");
        assertTrue(text.matches(".*; and \\d+ more"), text);
        assertEquals("a; b", ClearanceService.issuesText(List.of("a", "b")));
    }

    @Test
    @DisplayName("Reading a checklist never creates one")
    void getChecklistDoesNotGenerate() {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertTrue(clearanceService.getChecklist(job.getId()).isEmpty());

        verify(checklistItemRepository, never()).saveAll(anyList());
        verifyNoInteractions(jobRegulationPinRepository, regulationCatalogRepository);
    }

    private void stubGate(List<AuthoritySubmission> submissions) {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(submissions);
    }

    private static User customerOf(Club club) {
        User customer = new User();
        customer.setId(UUID.randomUUID());
        customer.setClub(club);
        return customer;
    }

    @Test
    @DisplayName("A request with no job yet has no documents to show its club")
    void requestChecklistIsEmptyBeforeApproval() {
        UUID requestId = UUID.randomUUID();
        when(transportJobRepository.findByRequestId(requestId)).thenReturn(Optional.empty());

        assertTrue(clearanceService
                .getCustomerRequestChecklist(requestId, customerOf(new Club()))
                .isEmpty());
    }

    @Test
    @DisplayName("A request's checklist is the job's, and another club's request is not found")
    void requestChecklistIsTheClubsOwn() {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setClub(club);
        job.setRequest(request);
        when(transportJobRepository.findByRequestId(request.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));

        assertEquals(
                List.of(checklistItem.getId()),
                clearanceService.getCustomerRequestChecklist(request.getId(), customerOf(club)).stream()
                        .map(ChecklistItemResponse::id)
                        .toList());

        Club other = new Club();
        other.setId(UUID.randomUUID());
        assertThrows(
                ResourceNotFoundException.class,
                () -> clearanceService.getCustomerRequestChecklist(request.getId(), customerOf(other)));
    }

    /** The setUp item, owed by its club's customer. */
    private User ownerOfTheItem() {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setClub(club);
        job.setRequest(request);
        checklistItem.getDocumentType().setProvidedBy(DocumentProvider.CUSTOMER);
        checklistItem.setStatus(ChecklistStatus.AWAITING_UPLOAD);
        checklistItem.setHolder(ChecklistHolder.CUSTOMER);
        when(checklistItemRepository.findById(checklistItem.getId())).thenReturn(Optional.of(checklistItem));
        return customerOf(club);
    }

    private static DocumentCheckRequest dates(String issuedOn, String validUntil) {
        return DocumentCheckRequest.builder()
                .issuedOn(LocalDate.parse(issuedOn))
                .validUntil(LocalDate.parse(validUntil))
                .build();
    }

    @Test
    @DisplayName("US-F2-03: the check gives the engine's answer and stores nothing")
    void checkAnswersWithoutStoringAnything() {
        User customer = ownerOfTheItem();
        when(validityEngine.evaluate(eq(checklistItem), any(), eq(job), any()))
                .thenReturn(new ValidityEngine.Result(
                        Validity.RED,
                        "Sampled 90 days before departure.",
                        "Sampled within 60 days before departure",
                        "Sampled 20 Jul 2026: 90 days before departure",
                        "sampled on 19 Aug 2026 or later",
                        null));

        DocumentCheckResponse answer = clearanceService.checkCustomerDocument(
                checklistItem.getId(), dates("2026-07-20", "2026-09-18"), customer);

        // US-F2-09: the refusal names the rule, the value found and the value required
        assertEquals(Validity.RED, answer.validity());
        assertEquals("Sampled 90 days before departure.", answer.note());
        assertEquals("Sampled within 60 days before departure", answer.rule());
        assertEquals("Sampled 20 Jul 2026: 90 days before departure", answer.found());
        assertEquals("sampled on 19 Aug 2026 or later", answer.required());
        verifyNoInteractions(fileService, documentVersionRepository, auditService);
        verify(checklistItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("US-F2-03: impossible dates are refused before the rule is looked at")
    void checkRefusesImpossibleDates() {
        User customer = ownerOfTheItem();

        for (DocumentCheckRequest bad : List.of(
                dates("2026-10-24", "2026-12-01"), // issued tomorrow
                dates("2026-10-01", "2026-09-30"), // expires before it was issued
                DocumentCheckRequest.builder()
                        .issuedOn(LocalDate.parse("2026-10-01"))
                        .sampledOn(LocalDate.parse("2026-10-02"))
                        .validUntil(LocalDate.parse("2026-12-01"))
                        .build())) {
            BusinessException ex = assertThrows(
                    BusinessException.class,
                    () -> clearanceService.checkCustomerDocument(checklistItem.getId(), bad, customer));
            assertEquals("DOCUMENT_DATES_INVALID", ex.getCode());
        }
        verifyNoInteractions(validityEngine);
    }

    @Test
    @DisplayName("US-F2-03: a customer can't upload an authority's document, after departure, or over a cleared one")
    void customerUploadsOnlyWhatIsStillTheirs() {
        User customer = ownerOfTheItem();
        DocumentUploadRequest upload = DocumentUploadRequest.builder()
                .fileId(UUID.randomUUID())
                .issuedOn(LocalDate.parse("2026-10-01"))
                .validUntil(LocalDate.parse("2026-12-01"))
                .build();

        checklistItem.getDocumentType().setProvidedBy(DocumentProvider.AUTHORITY);
        assertEquals(
                "DOCUMENT_FROM_AUTHORITY",
                assertThrows(
                                ConflictException.class,
                                () -> clearanceService.uploadCustomerDocumentVersion(
                                        checklistItem.getId(), upload, customer))
                        .getCode());
        checklistItem.getDocumentType().setProvidedBy(DocumentProvider.CUSTOMER);

        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);
        assertEquals(
                "DOCUMENT_CLEARED",
                assertThrows(
                                ConflictException.class,
                                () -> clearanceService.uploadCustomerDocumentVersion(
                                        checklistItem.getId(), upload, customer))
                        .getCode());

        job.setDepartedAt(Instant.parse("2026-10-20T01:00:00Z"));
        assertEquals(
                "JOB_DEPARTED",
                assertThrows(
                                ConflictException.class,
                                () -> clearanceService.uploadCustomerDocumentVersion(
                                        checklistItem.getId(), upload, customer))
                        .getCode());
        verifyNoInteractions(fileService);
    }

    @Test
    @DisplayName("US-F2-03: another club's document is not found, even to check")
    void anotherClubsDocumentIsNotFound() {
        ownerOfTheItem();
        Club other = new Club();
        other.setId(UUID.randomUUID());

        assertThrows(
                ResourceNotFoundException.class,
                () -> clearanceService.checkCustomerDocument(
                        checklistItem.getId(), dates("2026-10-01", "2026-12-01"), customerOf(other)));
        assertThrows(
                ResourceNotFoundException.class,
                () -> clearanceService.getCustomerVersions(checklistItem.getId(), customerOf(other)));
    }

    @Test
    @DisplayName("Both catalogs list a document: the mandatory rule wins, and on a tie the destination's, in any order")
    void theStricterRuleGovernsADocumentBothCatalogsList() {
        RegulationVersion vn = version();
        RegulationVersion hk = version();
        java.util.Map<UUID, RegulationRole> roles =
                java.util.Map.of(vn.getId(), RegulationRole.ORIGIN, hk.getId(), RegulationRole.DESTINATION);
        DocumentType exportCert = documentType();
        DocumentType passport = documentType();
        RegulationRule vnExport = rule(vn, exportCert, true);
        RegulationRule hkExport = rule(hk, exportCert, false);
        RegulationRule vnPassport = rule(vn, passport, true);
        RegulationRule hkPassport = rule(hk, passport, true);

        List<RegulationRule> picked =
                ClearanceService.governingRules(List.of(hkExport, vnExport, vnPassport, hkPassport), roles);
        List<RegulationRule> reversed =
                ClearanceService.governingRules(List.of(hkPassport, vnPassport, vnExport, hkExport), roles);

        assertEquals(2, picked.size());
        assertTrue(picked.contains(vnExport), "the mandatory rule wins over the optional one");
        assertTrue(picked.contains(hkPassport), "on a tie the destination's rule wins");
        assertEquals(Set.copyOf(picked), Set.copyOf(reversed));
    }

    private static RegulationVersion version() {
        RegulationVersion v = new RegulationVersion();
        v.setId(UUID.randomUUID());
        return v;
    }

    private static DocumentType documentType() {
        DocumentType t = new DocumentType();
        t.setId(UUID.randomUUID());
        return t;
    }

    private static RegulationRule rule(RegulationVersion version, DocumentType type, boolean mandatory) {
        RegulationRule r = new RegulationRule();
        r.setId(UUID.randomUUID());
        r.setVersion(version);
        r.setDocumentType(type);
        r.setMandatory(mandatory);
        return r;
    }
}
