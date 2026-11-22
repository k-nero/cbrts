package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationCounterOffer;
import com.equifreight.entity.QuotationCounterOfferLine;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CounterOfferStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.quotation.CounterOfferLineRequest;
import com.equifreight.model.quotation.CounterOfferRequest;
import com.equifreight.model.quotation.CounterOfferResponse;
import com.equifreight.model.quotation.CustomerQuotationResponse;
import com.equifreight.model.quotation.DeclineRequest;
import com.equifreight.model.quotation.IssueRequest;
import com.equifreight.model.quotation.RequoteRequest;
import com.equifreight.repository.RateFeeBandRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Quotation negotiation: the club sends a per-line counter-offer on an open version (spec 2026-11-23). */
class CustomerQuotationNegotiationTest extends QuotationServiceFixture {

    static final Instant ISSUED_AT = Instant.parse("2026-10-20T04:00:00Z");
    /** 22 Oct: v1 is open until the end of 27 Oct; the departure is 20 Nov. */
    static final Instant OFFERED_AT = Instant.parse("2026-10-22T04:00:00Z");

    NotificationService notifications;
    QuotationIssueService issue;
    Club club;
    User bookings;
    Quotation v1;

    @BeforeEach
    void setUpNegotiation() {
        notifications = mock(NotificationService.class);
        issue = new QuotationIssueService(
                requests,
                quotations,
                versions,
                pricing,
                notifications,
                audit,
                snapshots,
                Clock.fixed(ISSUED_AT, BusinessTime.ZONE),
                ledger);
        club = request.getClub();
        club.setId(UUID.randomUUID());
        bookings = new User();
        bookings.setId(UUID.randomUUID());

        Quotation q = startedWithIds();
        service.changeClass(yen, request.getId(), ServiceClass.FIRST);
        q.getLines().forEach(l -> {
            if (l.getId() == null) {
                l.setId(UUID.randomUUID());
            }
        });
        service.override(yen, request.getId(), lineKeyed("GROOM").getId(), override("1200.00"));
        service.addLine(yen, request.getId(), ferry("90.00", RateCertainty.FIXED, null));
        issue.issue(yen, request.getId(), new IssueRequest(null));
        v1 = q;
        if (v1.getId() == null) {
            v1.setId(UUID.randomUUID());
        }
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(v1));

        clearInvocations(audit, notifications);
    }

    CustomerQuotationService at(Instant now) {
        ClubService clubs = mock(ClubService.class);
        when(clubs.requireClub(bookings)).thenReturn(club);
        when(requests.findForUpdate(request.getId(), club.getId())).thenReturn(Optional.of(request));
        when(requests.findByIdAndClubId(request.getId(), club.getId())).thenReturn(Optional.of(request));
        return new CustomerQuotationService(
                requests,
                quotations,
                mock(RateFeeBandRepository.class),
                clubs,
                snapshots,
                audit,
                notifications,
                mock(InvoiceService.class),
                issue,
                Clock.fixed(now, BusinessTime.ZONE),
                mock(RequestFleetService.class),
                ledger);
    }

    void send(CounterOfferLineRequest... lines) {
        at(OFFERED_AT)
                .counterOffer(
                        bookings,
                        request.getId(),
                        new CounterOfferRequest(1, "We move horses with you monthly", List.of(lines)));
    }

    static CounterOfferLineRequest ask(String key, String amount, String reason) {
        return new CounterOfferLineRequest(key, new BigDecimal(amount), reason);
    }

    String ferryKey() {
        return v1.getLines().stream()
                .filter(l -> l.getLineKey().startsWith("MANUAL:"))
                .findFirst()
                .orElseThrow()
                .getLineKey();
    }

    @Test
    void aCounterOfferIsSavedOpenWithEachLineSnapshotted() {
        send(
                ask("GROOM", "1000", "Our own groom costs less"),
                ask(ferryKey(), "60", "Ferry booking is cheaper direct"));

        assertThat(offers).hasSize(1);
        QuotationCounterOffer o = offers.getFirst();
        assertThat(o.getStatus()).isEqualTo(CounterOfferStatus.OPEN);
        assertThat(o.getQuotation()).isSameAs(v1);
        assertThat(o.getRequest()).isSameAs(request);
        assertThat(o.getCreatedBy()).isSameAs(bookings);
        assertThat(o.getMessage()).isEqualTo("We move horses with you monthly");
        assertThat(o.getLines())
                .extracting(
                        QuotationCounterOfferLine::getLineKey,
                        QuotationCounterOfferLine::getDescription,
                        l -> l.getQuotedAmount().toPlainString(),
                        l -> l.getAskedAmount().toPlainString(),
                        QuotationCounterOfferLine::getReason)
                .containsExactly(
                        tuple("GROOM", "Flying groom", "1200.00", "1000", "Our own groom costs less"),
                        tuple(ferryKey(), "Ferry booking fee", "180.00", "60", "Ferry booking is cheaper direct"));
        assertThat(v1.getStatus()).isEqualTo(QuotationStatus.ISSUED);
        assertThat(request.getStatus()).isEqualTo(RequestStatus.QUOTED);
    }

    @Test
    void aCounterOfferIsAuditedAndTellsTheManager() {
        send(ask("GROOM", "1000", "Our own groom costs less"));

        verify(audit)
                .recordDecision(
                        eq(bookings),
                        eq("QUOTATION_COUNTER_OFFERED"),
                        eq("Counter-offer on Q-2026-0189 v1: Flying groom $1,200.00 → $1,000.00"),
                        eq(QuotationDraftService.ENTITY_TYPE),
                        eq(request.getId()),
                        eq(request.getCode()),
                        eq("We move horses with you monthly"),
                        isNull(),
                        isNull());
        verify(notifications)
                .notify(
                        eq(NotificationKind.QUOTATION_COUNTER_OFFER),
                        any(),
                        any(),
                        argThat(title -> title.contains("counter-offer on Q-2026-0189 v1")),
                        argThat(body -> body.contains("Flying groom $1,200.00 → $1,000.00")));
    }

    @Test
    void aSecondCounterOfferOnTheSameVersionIsRefused() {
        send(ask("GROOM", "1000", "Our own groom costs less"));

        assertThatThrownBy(() -> send(ask("GROOM", "900", "Still too much")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("You already negotiated version 1 on 22 Oct 2026.")
                .extracting("code")
                .isEqualTo("COUNTER_OFFER_EXISTS");
        assertThat(offers).hasSize(1);
    }

    @Test
    void anEmptyCounterOfferIsRefused() {
        assertThatThrownBy(this::send)
                .isInstanceOf(BusinessException.class)
                .hasMessage("Tick at least one line you'd like cheaper.")
                .extracting("code")
                .isEqualTo("COUNTER_OFFER_EMPTY");
    }

    @Test
    void anUnknownLineIsRefused() {
        assertThatThrownBy(() -> send(ask("NOPE", "10", "Why not")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("NOPE isn't on this quotation.")
                .extracting("code")
                .isEqualTo("COUNTER_OFFER_LINE_UNKNOWN");
    }

    @Test
    void aFixedFeeCantBeNegotiated() {
        lineKeyed("GROOM").setNegotiable(false);

        assertThatThrownBy(() -> send(ask("GROOM", "1000", "Our own groom costs less")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Flying groom is a fixed fee and can't be negotiated.")
                .extracting("code")
                .isEqualTo("COUNTER_OFFER_LINE_FIXED");
    }

    @Test
    void askingTheQuotedAmountOrMoreIsRefused() {
        assertThatThrownBy(() -> send(ask("GROOM", "1200.00", "Same")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Ask for less than $1,200.00 on Flying groom.")
                .extracting("code")
                .isEqualTo("COUNTER_OFFER_AMOUNT");
        assertThatThrownBy(() -> send(ask("GROOM", "1300", "More")))
                .extracting("code")
                .isEqualTo("COUNTER_OFFER_AMOUNT");

        send(ask("GROOM", "0", "We bring our own groom"));
        assertThat(offers).hasSize(1);
    }

    @Test
    void aCounterOfferOnAClosedQuotationIsRefusedLikeAccepting() {
        assertThatThrownBy(() -> at(Instant.parse("2026-10-29T04:00:00Z"))
                        .counterOffer(
                                bookings,
                                request.getId(),
                                new CounterOfferRequest(null, null, List.of(ask("GROOM", "1000", "x")))))
                .extracting("code")
                .isEqualTo("QUOTATION_EXPIRED");

        request.setDepartureDate(LocalDate.of(2026, 10, 22));
        assertThatThrownBy(() -> send(ask("GROOM", "1000", "x")))
                .extracting("code")
                .isEqualTo("DEPARTURE_PASSED");
    }

    // --- what the club reads ----------------------------------------------------------------------------------

    @Test
    void theCustomerSeesLineKeysAndWhichLinesAreNegotiable() {
        lineKeyed("GROOM").setNegotiable(false);

        CustomerQuotationResponse r = at(OFFERED_AT).get(bookings, request.getId());

        assertThat(r.groups().stream().flatMap(g -> g.lines().stream()))
                .extracting(CustomerQuotationResponse.Line::lineKey, CustomerQuotationResponse.Line::negotiable)
                .contains(tuple("STALL", true), tuple("GROOM", false), tuple(ferryKey(), true));
    }

    @Test
    void canNegotiateOnlyOnAnOpenVersionWithoutACounterOffer() {
        assertThat(at(OFFERED_AT).get(bookings, request.getId()).canNegotiate()).isTrue();
        assertThat(at(Instant.parse("2026-10-29T04:00:00Z"))
                        .get(bookings, request.getId())
                        .canNegotiate())
                .isFalse();

        send(ask("GROOM", "1000", "Our own groom costs less"));
        CustomerQuotationResponse after = at(OFFERED_AT).get(bookings, request.getId());

        assertThat(after.canNegotiate()).isFalse();
        assertThat(after.counterOffer().status()).isEqualTo(CounterOfferStatus.OPEN);
        assertThat(after.counterOffer().lines())
                .extracting(CounterOfferResponse.Line::lineKey)
                .containsExactly("GROOM");
    }

    // --- what closes it -----------------------------------------------------------------------------------------

    @Test
    void acceptingClosesTheOpenCounterOffer() {
        send(ask("GROOM", "1000", "Our own groom costs less"));

        at(OFFERED_AT).accept(bookings, request.getId());

        assertThat(offers.getFirst().getStatus()).isEqualTo(CounterOfferStatus.CLOSED);
        assertThat(offers.getFirst().getAnsweredAt()).isEqualTo(OFFERED_AT);
    }

    @Test
    void decliningClosesTheOpenCounterOffer() {
        send(ask("GROOM", "1000", "Our own groom costs less"));

        at(OFFERED_AT).decline(bookings, request.getId(), new DeclineRequest("Too dear", null));

        assertThat(offers.getFirst().getStatus()).isEqualTo(CounterOfferStatus.CLOSED);
        assertThat(offers.getFirst().getAnsweredAt()).isEqualTo(OFFERED_AT);
    }

    @Test
    void aRequoteIsRefusedWhileACounterOfferIsOpen() {
        send(ask("GROOM", "1000", "Our own groom costs less"));
        v1.setStatus(QuotationStatus.EXPIRED);
        request.setStatus(RequestStatus.EXPIRED);

        assertThatThrownBy(() -> at(Instant.parse("2026-10-29T04:00:00Z"))
                        .requote(bookings, request.getId(), new RequoteRequest(1, null)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("We're answering your counter-offer.")
                .extracting("code")
                .isEqualTo("COUNTER_OFFER_OPEN");
    }
}
