package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.model.incident.IncidentSummaryResponse;
import com.equifreight.model.job.JobSummaryResponse;
import com.equifreight.model.overview.OverviewResponse;
import com.equifreight.model.overview.QuoteOutResponse;
import com.equifreight.model.review.QueueRowResponse;
import com.equifreight.repository.QuotationRepository;
import java.time.Clock;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The logistics manager's Overview (US-R-01): what needs attention today, from the same lists the tiles open, so a
 * count and its list never disagree. Each is read in one page query: the review queue, the quotes out, the blocked
 * jobs, the open incidents and this week's departures.
 */
@Service
public class OverviewService {

    /** How many review-queue rows the Overview previews before "View all". */
    static final int QUEUE_PREVIEW = 5;
    /** How many blocked jobs the Clearance at risk panel lists, soonest departure first. */
    static final int AT_RISK = 4;

    private final RequestReviewService requests;
    private final TransportJobService jobs;
    private final IncidentService incidents;
    private final QuotationRepository quotations;
    private final OnTimeReportService onTime;
    private final Clock clock;

    public OverviewService(
            RequestReviewService requests,
            TransportJobService jobs,
            IncidentService incidents,
            QuotationRepository quotations,
            OnTimeReportService onTime,
            Clock clock) {
        this.requests = requests;
        this.jobs = jobs;
        this.incidents = incidents;
        this.quotations = quotations;
        this.onTime = onTime;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public OverviewResponse overview() {
        Page<QueueRowResponse> queue = requests.queue(PageRequest.of(0, QUEUE_PREVIEW));
        Page<QuoteOutResponse> quotes = quotesOut(PageRequest.of(0, 1));
        Sort soonest = Sort.by(Sort.Order.asc("plannedDepartureAt").nullsLast());
        Page<JobSummaryResponse> blocked = jobs.search(null, null, "BLOCKED", PageRequest.of(0, AT_RISK, soonest));
        Page<JobSummaryResponse> thisWeek = jobs.search(null, null, "THIS_WEEK", PageRequest.of(0, 1, soonest));
        Page<IncidentSummaryResponse> open = incidents.list(
                List.of(IncidentStatus.OPEN), PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "openedAt")));
        // The last 30 days, today included, as the on-time tile reads.
        java.time.LocalDate today = java.time.LocalDate.now(clock.withZone(BusinessTime.ZONE));
        var month = onTime.report(today.minusDays(29), today, OnTimeReportService.By.WEEK, null)
                .totals();
        return OverviewResponse.builder()
                .asOf(clock.instant())
                .onTimeRate(month.rate())
                .deliveredLast30Days(month.delivered())
                .lateLast30Days(month.late())
                .awaitingReview(queue.getTotalElements())
                .reviewQueue(queue.getContent())
                .quotesOut(quotes.getTotalElements())
                .nextToExpire(first(quotes))
                .jobsBlocked(blocked.getTotalElements())
                .clearanceAtRisk(blocked.getContent())
                .incidentsOpen(open.getTotalElements())
                .newestIncident(first(open))
                .departingThisWeek(thisWeek.getTotalElements())
                .nextDeparture(first(thisWeek))
                .build();
    }

    /** Issued quotations waiting for the customer's answer, soonest to expire first (Requests · Quotes out). */
    @Transactional(readOnly = true)
    public Page<QuoteOutResponse> quotesOut(Pageable pageable) {
        Pageable bySoonest = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.ASC, "validUntil"));
        return quotations
                .findByStatusAndRequest_Status(QuotationStatus.ISSUED, RequestStatus.QUOTED, bySoonest)
                .map(OverviewService::toQuoteOut);
    }

    private static QuoteOutResponse toQuoteOut(Quotation q) {
        return QuoteOutResponse.builder()
                .requestId(q.getRequest().getId())
                .requestCode(q.getRequest().getCode())
                .club(q.getRequest().getClub().getName())
                .quotationCode(q.getCode())
                .versionNo(q.getVersionNo())
                .total(q.getTotal())
                .currency(q.getCurrency())
                .validUntil(q.getValidUntil())
                .build();
    }

    private static <T> T first(Page<T> page) {
        return page.hasContent() ? page.getContent().getFirst() : null;
    }
}
