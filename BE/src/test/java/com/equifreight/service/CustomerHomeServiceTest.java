package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.Club;
import com.equifreight.entity.DocumentType;
import com.equifreight.entity.Horse;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.ChecklistHolder;
import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.HorseCoat;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.home.CustomerHomeResponse;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TransportRequestRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** The customer's Home: what the club owes, its moves in progress and its horses, from its own records only. */
class CustomerHomeServiceTest {

    /** 18 Oct 2026, 09:00 in Ho Chi Minh City. */
    private static final Instant NOW = Instant.parse("2026-10-18T02:00:00Z");

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 18);

    private final ClubService clubs = mock(ClubService.class);
    private final TransportRequestRepository requests = mock(TransportRequestRepository.class);
    private final QuotationRepository quotations = mock(QuotationRepository.class);
    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final ChecklistItemRepository checklist = mock(ChecklistItemRepository.class);
    private final HorseRepository horses = mock(HorseRepository.class);
    private final User customer = new User();
    private final Club club = new Club();
    private CustomerHomeService service;

    @BeforeEach
    void setUp() {
        service = new CustomerHomeService(
                clubs, requests, quotations, jobs, checklist, horses, Clock.fixed(NOW, BusinessTime.ZONE));
        club.setId(UUID.randomUUID());
        club.setName("Saigon Turf Club");
        when(clubs.requireClub(customer)).thenReturn(club);
        when(requests.findByClubIdAndStatusNotIn(eq(club.getId()), anyCollection()))
                .thenReturn(List.of());
        when(checklist.findOnUndepartedJobsOfClub(club.getId())).thenReturn(List.of());
        when(horses.findByClubIdAndArchivedAtIsNullOrderByName(club.getId())).thenReturn(List.of());
        when(requests.countHorses(any())).thenReturn(List.of());
        when(quotations.findByRequestIdInAndStatusNot(any(), eq(QuotationStatus.DRAFT)))
                .thenReturn(List.of());
        when(jobs.findByRequestIdIn(any())).thenReturn(List.of());
    }

    private TransportRequest request(String code, RequestStatus status) {
        TransportRequest r = new TransportRequest();
        r.setId(UUID.randomUUID());
        r.setCode(code);
        r.setClub(club);
        r.setStatus(status);
        r.setOriginText("Ho Chi Minh City");
        r.setDestinationText("Phnom Penh");
        r.setMode(TransportMode.ROAD);
        r.setTrailer(TrailerType.PRIVATE);
        r.setDepartureDate(LocalDate.of(2026, 11, 20));
        return r;
    }

    private Quotation quotation(TransportRequest r, QuotationStatus status) {
        Quotation q = new Quotation();
        q.setId(UUID.randomUUID());
        q.setRequest(r);
        q.setCode("Q-2026-0188");
        q.setVersionNo((short) 2);
        q.setStatus(status);
        q.setCurrency("USD");
        q.setTotal(new BigDecimal("38019.20"));
        q.setValidUntil(Instant.parse("2026-10-21T10:00:00Z"));
        return q;
    }

    private TransportJob job(TransportRequest r) {
        TransportJob j = new TransportJob();
        j.setId(UUID.randomUUID());
        j.setCode("CBRT-2026-041");
        j.setRequest(r);
        j.setPlannedDepartureAt(Instant.parse("2026-10-24T23:00:00Z"));
        return j;
    }

    private ChecklistItem owedDocument(TransportJob j, Horse horse, LocalDate due) {
        DocumentType type = new DocumentType();
        type.setName("Equine passport");
        ChecklistItem ci = new ChecklistItem();
        ci.setId(UUID.randomUUID());
        ci.setJob(j);
        ci.setHorse(horse);
        ci.setDocumentType(type);
        ci.setStatus(ChecklistStatus.AWAITING_UPLOAD);
        ci.setHolder(ChecklistHolder.CUSTOMER);
        ci.setDueDate(due);
        return ci;
    }

    private static Horse horse(String name) {
        Horse h = new Horse();
        h.setId(UUID.randomUUID());
        h.setName(name);
        h.setCoat(HorseCoat.GREY);
        h.setBreed("Andalusian");
        h.setSex(HorseSex.GELDING);
        return h;
    }

    @Test
    @DisplayName("a club with no requests and no horses gets an empty Home, not demo data")
    void emptyClub() {
        CustomerHomeResponse home = service.get(customer);

        assertThat(home.clubName()).isEqualTo("Saigon Turf Club");
        assertThat(home.owed()).isEmpty();
        assertThat(home.moves()).isEmpty();
        assertThat(home.horses()).isEmpty();
        assertThat(home.requestCount()).isZero();
        assertThat(home.nextDeparture()).isNull();
        assertThat(home.nextEvent()).isNull();
    }

    @Test
    @DisplayName("an issued quotation is owed until it is answered, due when it stops holding its price")
    void quotedRequestIsOwed() {
        TransportRequest r = request("REQ-2026-0179", RequestStatus.QUOTED);
        Quotation q = quotation(r, QuotationStatus.ISSUED);
        when(requests.findByClubIdAndStatusNotIn(eq(club.getId()), anyCollection()))
                .thenReturn(List.of(r));
        when(quotations.findByRequestIdInAndStatusNot(any(), eq(QuotationStatus.DRAFT)))
                .thenReturn(List.of(q));

        CustomerHomeResponse home = service.get(customer);

        assertThat(home.owed()).singleElement().satisfies(o -> {
            assertThat(o.kind()).isEqualTo("QUOTATION");
            assertThat(o.title()).isEqualTo("Accept or decline quotation Q-2026-0188 v2");
            assertThat(o.subject()).isEqualTo("REQ-2026-0179 · Q-2026-0188 · USD 38,019.20");
            assertThat(o.urgency()).isEqualTo("soon");
            assertThat(o.dueAt()).isEqualTo(q.getValidUntil());
        });
        assertThat(home.owedRequestCount()).isEqualTo(1);
        assertThat(home.moves()).singleElement().satisfies(m -> {
            assertThat(m.stage()).isEqualTo("Quotation");
            assertThat(m.holds().text()).isEqualTo("Quotation waiting for you");
        });
    }

    @Test
    @DisplayName("a request whose quotation the club declined has ended and is not a move")
    void declinedRequestIsNotAMove() {
        TransportRequest r = request("REQ-2026-0179", RequestStatus.EXPIRED);
        when(requests.findByClubIdAndStatusNotIn(eq(club.getId()), anyCollection()))
                .thenReturn(List.of(r));
        when(quotations.findByRequestIdInAndStatusNot(any(), eq(QuotationStatus.DRAFT)))
                .thenReturn(List.of(quotation(r, QuotationStatus.DECLINED)));

        CustomerHomeResponse home = service.get(customer);

        assertThat(home.moves()).isEmpty();
        assertThat(home.owed()).isEmpty();
    }

    @Test
    @DisplayName("an overdue document locks the departure in Bad and is named on its horse")
    void overdueDocumentLocksDeparture() {
        TransportRequest r = request("REQ-2026-0162", RequestStatus.APPROVED);
        TransportJob j = job(r);
        Horse silver = horse("Silver Bell");
        ChecklistItem passport = owedDocument(j, silver, TODAY.minusDays(1));
        when(requests.findByClubIdAndStatusNotIn(eq(club.getId()), anyCollection()))
                .thenReturn(List.of(r));
        when(jobs.findByRequestIdIn(any())).thenReturn(List.of(j));
        when(checklist.findOnUndepartedJobsOfClub(club.getId())).thenReturn(List.of(passport));
        when(horses.findByClubIdAndArchivedAtIsNullOrderByName(club.getId())).thenReturn(List.of(silver));

        CustomerHomeResponse home = service.get(customer);

        assertThat(home.owed()).singleElement().satisfies(o -> {
            assertThat(o.kind()).isEqualTo("DOCUMENT");
            assertThat(o.urgency()).isEqualTo("overdue");
            assertThat(o.title()).isEqualTo("Upload the equine passport");
            assertThat(o.subject()).isEqualTo("CBRT-2026-041 · Silver Bell · Equine passport");
            assertThat(o.requestId()).isEqualTo(r.getId());
            assertThat(o.itemId()).isEqualTo(passport.getId());
        });
        assertThat(home.moves()).singleElement().satisfies(m -> {
            assertThat(m.stage()).isEqualTo("Documents");
            assertThat(m.holds().text()).isEqualTo("Departure locked · you owe 1");
            assertThat(m.holds().tone()).isEqualTo("bad");
            assertThat(m.detail()).isEqualTo("job CBRT-2026-041 · 0 horses · road, private trailer");
        });
        assertThat(home.nextDeparture().state()).isEqualTo("locked");
        assertThat(home.horses()).singleElement().satisfies(h -> {
            assertThat(h.line()).isEqualTo("Grey · Andalusian gelding");
            assertThat(h.documents()).isEqualTo("0 of 1 cleared");
            assertThat(h.note().text()).isEqualTo("Equine passport overdue");
            assertThat(h.note().tone()).isEqualTo("bad");
        });
    }

    @Test
    @DisplayName("with nothing owed, the next event leads: the next departure of a job")
    void nothingOwedLeadsWithNextEvent() {
        TransportRequest r = request("REQ-2026-0162", RequestStatus.APPROVED);
        TransportJob j = job(r);
        when(requests.findByClubIdAndStatusNotIn(eq(club.getId()), anyCollection()))
                .thenReturn(List.of(r));
        when(jobs.findByRequestIdIn(any())).thenReturn(List.of(j));

        CustomerHomeResponse home = service.get(customer);

        assertThat(home.owed()).isEmpty();
        assertThat(home.nextEvent().title()).isEqualTo("Nothing needed from you");
        assertThat(home.nextEvent().verb()).isEqualTo("Departs");
        assertThat(home.nextEvent().at()).isEqualTo(j.getPlannedDepartureAt());
        assertThat(home.moves())
                .singleElement()
                .satisfies(m -> assertThat(m.holds().text()).isEqualTo("Documents in review · nothing needed"));
    }

    @Test
    @DisplayName("moves that need the club come first, then by departure")
    void movesNeedingTheClubFirst() {
        TransportRequest review = request("REQ-2026-0193", RequestStatus.UNDER_REVIEW);
        review.setDepartureDate(LocalDate.of(2026, 10, 30));
        TransportRequest draft = request("REQ-2026-0194", RequestStatus.DRAFT);
        draft.setDepartureDate(LocalDate.of(2026, 12, 1));
        when(requests.findByClubIdAndStatusNotIn(eq(club.getId()), anyCollection()))
                .thenReturn(List.of(review, draft));

        CustomerHomeResponse home = service.get(customer);

        assertThat(home.moves()).extracting(m -> m.requestCode()).containsExactly("REQ-2026-0194", "REQ-2026-0193");
    }

    @Test
    @DisplayName("urgency: overdue past the date, soon within 7 days, else upcoming")
    void urgency() {
        assertThat(CustomerHomeService.urgency(TODAY.minusDays(1), TODAY)).isEqualTo("overdue");
        assertThat(CustomerHomeService.urgency(TODAY.plusDays(7), TODAY)).isEqualTo("soon");
        assertThat(CustomerHomeService.urgency(TODAY.plusDays(8), TODAY)).isEqualTo("upcoming");
        assertThat(CustomerHomeService.urgency(null, TODAY)).isEqualTo("upcoming");
    }
}
