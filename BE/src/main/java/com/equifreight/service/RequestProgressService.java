package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.AuditLog;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.model.request.LeadTimeResponse;
import com.equifreight.model.request.NextStepResponse;
import com.equifreight.model.request.RequestMapper;
import com.equifreight.model.review.HistoryEntryResponse;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.TransportJobRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Where a customer's request stands (US-F1-08): every status change it went through, read from the audit trail
 * (BR-F1-08), and the next step with the one who owns it. Work that doesn't move the request, such as a manager
 * re-pricing a quotation draft, stays off the customer's history.
 */
@Service
public class RequestProgressService {

    private static final String ENTITY_TYPE = "TRANSPORT_REQUEST";
    private static final String YOU = "You";

    private final AuditLogRepository auditLogs;
    private final QuotationRepository quotations;
    private final TransportJobRepository jobs;
    private final JsonMapper json;
    private final Clock clock;

    public RequestProgressService(
            AuditLogRepository auditLogs,
            QuotationRepository quotations,
            TransportJobRepository jobs,
            JsonMapper json,
            Clock clock) {
        this.auditLogs = auditLogs;
        this.quotations = quotations;
        this.jobs = jobs;
        this.json = json;
        this.clock = clock;
    }

    /** {@code jobCode} is the approved request's job (BR-F1-05), which its trip tracking opens; else null. */
    public record Progress(List<HistoryEntryResponse> history, NextStepResponse nextStep, String jobCode) {
        public Progress(List<HistoryEntryResponse> history, NextStepResponse nextStep) {
            this(history, nextStep, null);
        }
    }

    /** {@code leadTime} is the request's own, worked out while the customer may still change it; else null. */
    @Transactional(readOnly = true)
    public Progress of(TransportRequest request, LeadTimeResponse leadTime) {
        List<HistoryEntryResponse> history =
                auditLogs.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(ENTITY_TYPE, request.getId()).stream()
                        .filter(this::changesStatus)
                        .map(RequestMapper::toCustomerHistory)
                        .toList();
        String jobCode = request.getStatus() == RequestStatus.APPROVED
                ? jobs.findByRequestId(request.getId())
                        .map(TransportJob::getCode)
                        .orElse(null)
                : null;
        return new Progress(history, nextStep(request, leadTime), jobCode);
    }

    /** A row whose status after differs from the one before it: a step of the request's lifecycle. */
    private boolean changesStatus(AuditLog row) {
        String after = statusIn(row.getAfter());
        return after != null && !after.equals(statusIn(row.getBefore()));
    }

    private String statusIn(String raw) {
        if (raw == null) return null;
        JsonNode status = json.readTree(raw).get("status");
        return status == null || status.isNull() ? null : status.asString();
    }

    private NextStepResponse nextStep(TransportRequest request, LeadTimeResponse leadTime) {
        return switch (request.getStatus()) {
            case DRAFT, REJECTED, CANCELLED -> null;
            case SUBMITTED ->
                theirs("Check the route, dates and capacity, then prepare your quotation", manager(request));
            case UNDER_REVIEW -> theirs("Prepare your itemised quotation", manager(request));
            case INFO_REQUIRED ->
                yours("Answer the logistics manager's note and send your request again", answerBy(request, leadTime));
            case QUOTED ->
                issued(request)
                        .map(q -> yours(
                                "Accept or decline quotation " + q.getCode() + " v" + q.getVersionNo(),
                                LocalDate.ofInstant(q.getValidUntil(), BusinessTime.ZONE)))
                        .orElse(null);
            case CUSTOMER_ACCEPTED ->
                theirs("Approve the move into a transport job and name its team", manager(request));
            case EXPIRED ->
                issued(request)
                        .filter(q -> q.getStatus() != QuotationStatus.DECLINED)
                        .flatMap(q -> requoting(request)
                                .map(draft -> theirs(
                                        "Issue version " + draft.getVersionNo() + " of the quotation", manager(draft)))
                                .or(() -> requote(request, q)))
                        .orElse(null);
            case APPROVED ->
                jobs.findByRequestId(request.getId()).map(this::documents).orElse(null);
        };
    }

    /**
     * An expired quotation is priced again only when the customer asks (A4), up to the day before departure, as
     * {@code CustomerQuotationService.requote} allows; with the departure today or past there is nothing left to do.
     */
    private Optional<NextStepResponse> requote(TransportRequest request, Quotation expired) {
        LocalDate departure = request.getDepartureDate();
        if (departure != null && !departure.isAfter(LocalDate.now(clock.withZone(BusinessTime.ZONE)))) {
            return Optional.empty();
        }
        return Optional.of(yours(
                "Ask for a re-quote of quotation " + expired.getCode() + " v" + expired.getVersionNo(),
                departure == null ? null : departure.minusDays(1)));
    }

    /** The checklist is generated at approval; the transport specialist checks what the customer sends. */
    private NextStepResponse documents(TransportJob job) {
        String checker = job.getTransportSpecialist() == null
                ? "the transport specialist"
                : job.getTransportSpecialist().displayName() + ", transport specialist,";
        return yours(
                "Send the documents on the checklist for job " + job.getCode() + "; " + checker + " checks each one",
                null);
    }

    /**
     * The last day an answer still meets the lead time (BR-F1-01): the departure less the notice it needs, counted
     * the way the lead-time check counts it. Null when the request has no departure or route to count from.
     */
    private LocalDate answerBy(TransportRequest request, LeadTimeResponse leadTime) {
        if (leadTime == null || request.getDepartureDate() == null) return null;
        LocalDate today = LocalDate.now(clock);
        return request.getDepartureDate().minusDays(ChronoUnit.DAYS.between(today, leadTime.earliestDeparture()));
    }

    private Optional<Quotation> issued(TransportRequest request) {
        return quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT);
    }

    /** The next version being drafted, after a re-quote (A4) or the manager's own revise. */
    private Optional<Quotation> requoting(TransportRequest request) {
        return quotations
                .findFirstByRequestIdOrderByVersionNoDesc(request.getId())
                .filter(q -> q.getStatus() == QuotationStatus.DRAFT);
    }

    /** The manager who prepares the request's quotation; anyone in the role until one has started it. */
    private String manager(TransportRequest request) {
        return manager(quotations
                .findFirstByRequestIdOrderByVersionNoDesc(request.getId())
                .orElse(null));
    }

    private static String manager(Quotation q) {
        User by = q == null ? null : q.getPreparedBy();
        return by == null ? "A logistics manager" : by.displayName() + ", logistics manager";
    }

    private static NextStepResponse yours(String action, LocalDate due) {
        return NextStepResponse.builder()
                .action(action)
                .owner(YOU)
                .yours(true)
                .due(due)
                .build();
    }

    private static NextStepResponse theirs(String action, String owner) {
        return NextStepResponse.builder()
                .action(action)
                .owner(owner)
                .yours(false)
                .build();
    }
}
