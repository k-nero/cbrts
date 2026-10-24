package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.model.incident.IncidentSummaryResponse;
import com.equifreight.model.job.JobSummaryResponse;
import com.equifreight.model.overview.OverviewResponse;
import com.equifreight.model.review.QueueRowResponse;
import com.equifreight.repository.QuotationRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** US-R-01: the logistics manager's Overview. */
class OverviewServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T02:00:00Z");

    private final RequestReviewService requests = mock(RequestReviewService.class);
    private final TransportJobService jobs = mock(TransportJobService.class);
    private final IncidentService incidents = mock(IncidentService.class);
    private final QuotationRepository quotations = mock(QuotationRepository.class);
    private OverviewService service;

    @BeforeEach
    void setUp() {
        service = new OverviewService(requests, jobs, incidents, quotations, Clock.fixed(NOW, BusinessTime.ZONE));
    }

    private static <T> Page<T> page(List<T> rows, long total) {
        return new PageImpl<>(rows, PageRequest.of(0, Math.max(rows.size(), 1)), total);
    }

    private static JobSummaryResponse job(String code, String reason) {
        return new JobSummaryResponse(
                UUID.randomUUID(),
                code,
                "Ho Chi Minh City",
                "Phnom Penh",
                2,
                List.of(),
                null,
                null,
                null,
                NOW.plusSeconds(86_400),
                null,
                null,
                null,
                reason,
                null,
                null,
                null);
    }

    private static Quotation quotation() {
        Club club = new Club();
        club.setName("Saigon Turf Club");
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0196");
        request.setClub(club);
        Quotation q = new Quotation();
        q.setCode("Q-2026-0188");
        q.setVersionNo((short) 2);
        q.setRequest(request);
        q.setTotal(new BigDecimal("11830.09"));
        q.setCurrency("USD");
        q.setValidUntil(Instant.parse("2026-10-26T16:59:59Z"));
        return q;
    }

    @Test
    @DisplayName("Each count comes with the case that matters most, from the same list its tile opens")
    void theOverview() {
        QueueRowResponse oldest =
                QueueRowResponse.builder().code("REQ-2026-0187").build();
        when(requests.queue(any())).thenReturn(page(List.of(oldest), 4));
        when(quotations.findByStatusAndRequest_Status(eq(QuotationStatus.ISSUED), eq(RequestStatus.QUOTED), any()))
                .thenReturn(page(List.of(quotation()), 3));
        JobSummaryResponse permit = job("CBRT-2026-038", "Departure locked · 1 document missing");
        when(jobs.search(isNull(), isNull(), eq("BLOCKED"), any())).thenReturn(page(List.of(permit), 2));
        when(jobs.search(isNull(), isNull(), eq("THIS_WEEK"), any()))
                .thenReturn(page(List.of(job("CBRT-2026-042", null)), 1));
        IncidentSummaryResponse incident = new IncidentSummaryResponse(
                UUID.randomUUID(),
                "CBRT-2026-036",
                IncidentKind.TRAFFIC,
                "Prolonged traffic jam",
                IncidentStatus.OPEN,
                null,
                "Jam at Mộc Bài",
                null,
                null,
                NOW,
                "Vũ Hải Yến");
        when(incidents.list(eq(List.of(IncidentStatus.OPEN)), any())).thenReturn(page(List.of(incident), 1));

        OverviewResponse r = service.overview();

        assertEquals(NOW, r.asOf());
        assertEquals(4, r.awaitingReview());
        assertEquals(List.of(oldest), r.reviewQueue());
        assertEquals(3, r.quotesOut());
        assertEquals("Q-2026-0188", r.nextToExpire().quotationCode());
        assertEquals("Saigon Turf Club", r.nextToExpire().club());
        assertEquals(2, r.jobsBlocked());
        assertEquals(List.of(permit), r.clearanceAtRisk());
        assertEquals(1, r.incidentsOpen());
        assertEquals(incident, r.newestIncident());
        assertEquals(1, r.departingThisWeek());
        assertEquals("CBRT-2026-042", r.nextDeparture().code());
    }

    @Test
    @DisplayName("The previews are the oldest requests, the blocked jobs leaving soonest, and the newest incident")
    void theOrderOfEachPreview() {
        when(requests.queue(any())).thenReturn(page(List.of(), 0));
        when(quotations.findByStatusAndRequest_Status(any(), any(), any())).thenReturn(page(List.of(), 0));
        when(jobs.search(any(), any(), any(), any())).thenReturn(page(List.of(), 0));
        when(incidents.list(any(), any())).thenReturn(page(List.of(), 0));

        OverviewResponse r = service.overview();

        assertNull(r.nextToExpire());
        assertNull(r.nextDeparture());
        assertNull(r.newestIncident());
        ArgumentCaptor<Pageable> queue = ArgumentCaptor.forClass(Pageable.class);
        verify(requests).queue(queue.capture());
        assertEquals(OverviewService.QUEUE_PREVIEW, queue.getValue().getPageSize());
        ArgumentCaptor<Pageable> blocked = ArgumentCaptor.forClass(Pageable.class);
        verify(jobs).search(isNull(), isNull(), eq("BLOCKED"), blocked.capture());
        assertEquals(OverviewService.AT_RISK, blocked.getValue().getPageSize());
        assertEquals(
                Sort.Direction.ASC,
                blocked.getValue().getSort().getOrderFor("plannedDepartureAt").getDirection());
        ArgumentCaptor<Pageable> quotes = ArgumentCaptor.forClass(Pageable.class);
        verify(quotations).findByStatusAndRequest_Status(any(), any(), quotes.capture());
        assertEquals(
                Sort.Direction.ASC,
                quotes.getValue().getSort().getOrderFor("validUntil").getDirection());
        ArgumentCaptor<Pageable> open = ArgumentCaptor.forClass(Pageable.class);
        verify(incidents).list(any(), open.capture());
        assertEquals(
                Sort.Direction.DESC,
                open.getValue().getSort().getOrderFor("openedAt").getDirection());
    }
}
