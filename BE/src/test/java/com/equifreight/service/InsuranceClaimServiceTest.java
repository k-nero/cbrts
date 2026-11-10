package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Club;
import com.equifreight.entity.Incident;
import com.equifreight.entity.InsuranceClaim;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.InsuranceClaimStatus;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.incident.FileInsuranceClaimRequest;
import com.equifreight.model.incident.InsuranceClaimOutcomeRequest;
import com.equifreight.repository.InsuranceClaimRepository;
import com.equifreight.service.notification.Audience;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class InsuranceClaimServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T03:00:00Z");

    private final IncidentService incidents = mock(IncidentService.class);
    private final InsuranceClaimRepository claims = mock(InsuranceClaimRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final NotificationService notifications = mock(NotificationService.class);

    private InsuranceClaimService service;
    private Incident incident;
    private User yen;

    @BeforeEach
    void setUp() {
        service = new InsuranceClaimService(incidents, claims, audit, notifications, Clock.fixed(NOW, ZoneOffset.UTC));
        yen = new User();
        yen.setId(UUID.randomUUID());
        yen.setFirstName("Hải Yến");
        yen.setLastName("Vũ");
        yen.setEmail("yen@equifreight.vn");

        Club club = new Club();
        club.setId(UUID.randomUUID());
        TransportRequest request = new TransportRequest();
        request.setClub(club);
        request.setInsurance(InsuranceOption.EQUIFREIGHT);
        Quotation quotation = new Quotation();
        quotation.setCurrency("USD");
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setRequest(request);
        job.setQuotation(quotation);
        incident = new Incident();
        incident.setId(UUID.randomUUID());
        incident.setJob(job);
        incident.setKind(IncidentKind.WELFARE);
        when(incidents.incident(incident.getId())).thenReturn(incident);
        when(claims.findByIncident_Id(incident.getId())).thenReturn(Optional.empty());
    }

    private static FileInsuranceClaimRequest filing() {
        return new FileInsuranceClaimRequest("PVI Insurance", "PVI-2026-0412", new BigDecimal("4800.00"), null);
    }

    private InsuranceClaim filed() {
        InsuranceClaim claim = new InsuranceClaim();
        claim.setIncident(incident);
        claim.setInsurer("PVI Insurance");
        claim.setReference("PVI-2026-0412");
        claim.setClaimedAmount(new BigDecimal("4800.00"));
        claim.setStatus(InsuranceClaimStatus.FILED);
        claim.setFiledBy(yen);
        claim.setFiledAt(NOW);
        when(claims.findByIncident_Id(incident.getId())).thenReturn(Optional.of(claim));
        return claim;
    }

    @Test
    @DisplayName("Filing a claim records it, audits it and tells the club the insurer, reference and amount")
    void filingAClaim() {
        service.file(incident.getId(), filing(), yen);

        ArgumentCaptor<InsuranceClaim> saved = ArgumentCaptor.forClass(InsuranceClaim.class);
        verify(claims).save(saved.capture());
        assertEquals(InsuranceClaimStatus.FILED, saved.getValue().getStatus());
        assertEquals(NOW, saved.getValue().getFiledAt());
        assertEquals(yen, saved.getValue().getFiledBy());
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("FILE_INSURANCE_CLAIM"),
                        eq("Filed a claim with PVI Insurance (PVI-2026-0412) for USD 4,800.00 on CBRT-2026-041"),
                        eq("INCIDENT"),
                        eq(incident.getId()),
                        eq("CBRT-2026-041"),
                        isNull(),
                        isNull(),
                        eq("FILED"));
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_UPDATE),
                        eq(Audience.club(
                                incident.getJob().getRequest().getClub().getId())),
                        any(),
                        eq("Insurance claim filed for CBRT-2026-041"),
                        eq("We have filed a claim with PVI Insurance, reference PVI-2026-0412, for USD 4,800.00."));
    }

    @Test
    @DisplayName("Only a job insured with EquiFreight takes a claim, and only one per incident")
    void filingRefusals() {
        incident.getJob().getRequest().setInsurance(InsuranceOption.OWN_POLICY);
        BusinessException own =
                assertThrows(BusinessException.class, () -> service.file(incident.getId(), filing(), yen));
        assertEquals(
                "CBRT-2026-041 is insured on the customer's own policy: the customer claims on it themselves",
                own.getMessage());

        incident.getJob().getRequest().setInsurance(InsuranceOption.EQUIFREIGHT);
        filed();
        assertThrows(BusinessException.class, () -> service.file(incident.getId(), filing(), yen));
        verify(claims, never()).save(any());
    }

    @Test
    @DisplayName("A settled claim keeps what the insurer paid, never more than claimed, and is final")
    void settlingAClaim() {
        InsuranceClaim claim = filed();

        BusinessException tooMuch = assertThrows(
                BusinessException.class,
                () -> service.recordOutcome(
                        incident.getId(),
                        new InsuranceClaimOutcomeRequest(InsuranceClaimStatus.SETTLED, new BigDecimal("4800.01"), null),
                        yen));
        assertEquals("The insurer can't pay more than was claimed, USD 4,800.00", tooMuch.getMessage());

        service.recordOutcome(
                incident.getId(),
                new InsuranceClaimOutcomeRequest(InsuranceClaimStatus.SETTLED, new BigDecimal("4200.00"), null),
                yen);
        assertEquals(InsuranceClaimStatus.SETTLED, claim.getStatus());
        assertEquals(new BigDecimal("4200.00"), claim.getSettledAmount());
        assertEquals(NOW, claim.getClosedAt());
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_UPDATE),
                        any(),
                        any(),
                        eq("Insurance claim settled for CBRT-2026-041"),
                        eq("PVI Insurance settled claim PVI-2026-0412: USD 4,200.00, paid to you directly."));

        BusinessException again = assertThrows(
                BusinessException.class,
                () -> service.recordOutcome(
                        incident.getId(),
                        new InsuranceClaimOutcomeRequest(InsuranceClaimStatus.DECLINED, null, "Late"),
                        yen));
        assertEquals("The claim is already settled", again.getMessage());
    }

    @Test
    @DisplayName("A declined claim needs the reason; filed isn't an outcome")
    void decliningAClaim() {
        InsuranceClaim claim = filed();
        assertThrows(
                BusinessException.class,
                () -> service.recordOutcome(
                        incident.getId(),
                        new InsuranceClaimOutcomeRequest(InsuranceClaimStatus.DECLINED, null, " "),
                        yen));
        assertThrows(
                BusinessException.class,
                () -> service.recordOutcome(
                        incident.getId(),
                        new InsuranceClaimOutcomeRequest(InsuranceClaimStatus.FILED, null, null),
                        yen));

        service.recordOutcome(
                incident.getId(),
                new InsuranceClaimOutcomeRequest(
                        InsuranceClaimStatus.DECLINED, null, "Pre-existing condition, per the vet's report"),
                yen);
        assertEquals(InsuranceClaimStatus.DECLINED, claim.getStatus());
        assertEquals("Pre-existing condition, per the vet's report", claim.getDeclineReason());
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("SETTLE_INSURANCE_CLAIM"),
                        eq("Claim PVI-2026-0412 declined on CBRT-2026-041"),
                        eq("INCIDENT"),
                        eq(incident.getId()),
                        eq("CBRT-2026-041"),
                        anyString(),
                        eq("FILED"),
                        eq("DECLINED"));
    }
}
