package com.equifreight.service;

import com.equifreight.entity.Club;
import com.equifreight.entity.Incident;
import com.equifreight.entity.InsuranceClaim;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.InsuranceClaimStatus;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.incident.CustomerInsuranceClaimResponse;
import com.equifreight.model.incident.FileInsuranceClaimRequest;
import com.equifreight.model.incident.IncidentResponse;
import com.equifreight.model.incident.InsuranceClaimOutcomeRequest;
import com.equifreight.repository.InsuranceClaimRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Insurance claims on incidents (US-F5-08): only for a job insured with EquiFreight, one per incident, filed and then
 * settled or declined. The insurer pays the owner directly, so a claim never touches the invoices.
 */
@Log4j2
@Service
public class InsuranceClaimService {

    private static final String ENTITY_TYPE = "INCIDENT";

    private final IncidentService incidents;
    private final InsuranceClaimRepository claims;
    private final AuditService audit;
    private final NotificationService notifications;
    private final ClubService clubs;
    private final TransportRequestRepository requests;
    private final Clock clock;

    public InsuranceClaimService(
            IncidentService incidents,
            InsuranceClaimRepository claims,
            AuditService audit,
            NotificationService notifications,
            ClubService clubs,
            TransportRequestRepository requests,
            Clock clock) {
        this.incidents = incidents;
        this.claims = claims;
        this.audit = audit;
        this.notifications = notifications;
        this.clubs = clubs;
        this.requests = requests;
        this.clock = clock;
    }

    /** Files the claim, at any stage of the incident: a claim usually outlives it. */
    @Transactional
    public IncidentResponse file(UUID incidentId, FileInsuranceClaimRequest request, User manager) {
        Incident incident = incidents.incident(incidentId);
        String code = incident.getJob().getCode();
        if (incident.getJob().getRequest().getInsurance() != InsuranceOption.EQUIFREIGHT) {
            throw new BusinessException(
                    code + " is insured on the customer's own policy: the customer claims on it themselves");
        }
        if (claims.findByIncident_Id(incidentId).isPresent()) {
            throw new BusinessException("This incident already has an insurance claim");
        }
        InsuranceClaim claim = new InsuranceClaim();
        claim.setIncident(incident);
        claim.setInsurer(request.insurer().strip());
        claim.setReference(request.reference().strip());
        claim.setClaimedAmount(request.claimedAmount());
        claim.setNote(
                request.note() == null || request.note().isBlank()
                        ? null
                        : request.note().strip());
        claim.setStatus(InsuranceClaimStatus.FILED);
        claim.setFiledBy(manager);
        claim.setFiledAt(clock.instant());
        claims.save(claim);

        String currency = IncidentService.currencyOf(incident);
        audit.recordDecision(
                manager,
                "FILE_INSURANCE_CLAIM",
                AuditText.fit("Filed a claim with " + claim.getInsurer() + " (" + claim.getReference() + ") for "
                        + IncidentService.money(currency, claim.getClaimedAmount()) + " on " + code),
                ENTITY_TYPE,
                incident.getId(),
                code,
                claim.getNote(),
                null,
                InsuranceClaimStatus.FILED.name());
        tellClub(
                incident,
                "Insurance claim filed for " + code,
                "We have filed a claim with " + claim.getInsurer() + ", reference " + claim.getReference() + ", for "
                        + IncidentService.money(currency, claim.getClaimedAmount()) + ".");
        log.info("Insurance claim {} filed on {} by {}", claim.getReference(), code, manager.getEmail());
        return incidents.toResponse(incident);
    }

    /** Records the insurer's answer: settled with the amount paid, or declined with the reason. Either is final. */
    @Transactional
    public IncidentResponse recordOutcome(UUID incidentId, InsuranceClaimOutcomeRequest request, User manager) {
        Incident incident = incidents.incident(incidentId);
        String code = incident.getJob().getCode();
        InsuranceClaim claim = claims.findByIncident_Id(incidentId)
                .orElseThrow(() -> new BusinessException("No insurance claim has been filed on this incident"));
        if (claim.getStatus() != InsuranceClaimStatus.FILED) {
            throw new BusinessException(
                    "The claim is already " + claim.getStatus().name().toLowerCase());
        }
        String currency = IncidentService.currencyOf(incident);
        String text;
        String body;
        switch (request.outcome()) {
            case SETTLED -> {
                if (request.settledAmount() == null) {
                    throw new BusinessException("Say how much the insurer paid");
                }
                if (request.settledAmount().compareTo(claim.getClaimedAmount()) > 0) {
                    throw new BusinessException("The insurer can't pay more than was claimed, "
                            + IncidentService.money(currency, claim.getClaimedAmount()));
                }
                claim.setSettledAmount(request.settledAmount());
                text = "Claim " + claim.getReference() + " settled: "
                        + IncidentService.money(currency, request.settledAmount());
                body = claim.getInsurer() + " settled claim " + claim.getReference() + ": "
                        + IncidentService.money(currency, request.settledAmount()) + ", paid to you directly.";
            }
            case DECLINED -> {
                if (request.declineReason() == null || request.declineReason().isBlank()) {
                    throw new BusinessException("Say why the insurer declined the claim");
                }
                claim.setDeclineReason(request.declineReason().strip());
                text = "Claim " + claim.getReference() + " declined";
                body = claim.getInsurer() + " declined claim " + claim.getReference() + ": " + claim.getDeclineReason();
            }
            default -> throw new BusinessException("The outcome is settled or declined");
        }
        Instant now = clock.instant();
        claim.setStatus(request.outcome());
        claim.setClosedBy(manager);
        claim.setClosedAt(now);
        claims.save(claim);

        audit.recordDecision(
                manager,
                "SETTLE_INSURANCE_CLAIM",
                AuditText.fit(text + " on " + code),
                ENTITY_TYPE,
                incident.getId(),
                code,
                claim.getDeclineReason(),
                InsuranceClaimStatus.FILED.name(),
                request.outcome().name());
        tellClub(incident, "Insurance claim " + request.outcome().name().toLowerCase() + " for " + code, body);
        return incidents.toResponse(incident);
    }

    /** The claims on one of the club's requests, for its request page (US-F5-08); anyone else's request is not found. */
    @Transactional(readOnly = true)
    public List<CustomerInsuranceClaimResponse> ofRequest(User customer, UUID requestId) {
        Club club = clubs.requireClub(customer);
        requests.findByIdAndClubId(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        return claims.findByRequestId(requestId).stream()
                .map(c -> new CustomerInsuranceClaimResponse(
                        c.getId(),
                        c.getIncident().getJob().getCode(),
                        c.getIncident().getKind().label(),
                        c.getInsurer(),
                        c.getReference(),
                        IncidentService.currencyOf(c.getIncident()),
                        c.getClaimedAmount(),
                        c.getStatus(),
                        c.getSettledAmount(),
                        c.getDeclineReason(),
                        c.getFiledAt(),
                        c.getClosedAt()))
                .toList();
    }

    private void tellClub(Incident incident, String title, String body) {
        notifications.notify(
                NotificationKind.INCIDENT_UPDATE,
                Audience.club(incident.getJob().getRequest().getClub().getId()),
                Subject.incident(incident),
                title,
                body);
    }
}
