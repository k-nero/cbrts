package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.RateFeeBand;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.FeeBandKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.CustomerQuotationResponse;
import com.equifreight.model.quotation.IssueRequest;
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

/** US-Q-08, US-Q-03, US-Q-06 (customer side): the issued quotation as the club reads it. */
class CustomerQuotationServiceTest extends QuotationServiceFixture {

    static final Instant ISSUED_AT = Instant.parse("2026-10-20T04:00:00Z");

    NotificationService notifications;
    QuotationIssueService issue;
    RateFeeBandRepository feeBands;
    ClubService clubs;
    CustomerQuotationService customer;
    User bookings;

    @BeforeEach
    void setUpCustomer() {
        notifications = mock(NotificationService.class);
        feeBands = mock(RateFeeBandRepository.class);
        clubs = mock(ClubService.class);
        Clock clock = Clock.fixed(ISSUED_AT, BusinessTime.ZONE);
        issue = new QuotationIssueService(
                requests, quotations, versions, pricing, notifications, audit, snapshots, clock);
        customer = new CustomerQuotationService(
                requests,
                quotations,
                feeBands,
                clubs,
                snapshots,
                audit,
                notifications,
                mock(InvoiceService.class),
                issue,
                clock);
        Club club = request.getClub();
        club.setId(UUID.randomUUID());
        bookings = new User();
        when(clubs.requireClub(bookings)).thenReturn(club);
        when(requests.findByIdAndClubId(request.getId(), club.getId())).thenReturn(Optional.of(request));
        when(feeBands.findByVersionIdAndKindOrderByMinDays(v2.getId(), FeeBandKind.CANCELLATION))
                .thenReturn(List.of(band(0, 6, "100"), band(7, 13, "50"), band(14, 29, "25"), band(30, null, "10")));
        yen.setFirstName("Thị Yến");
        yen.setLastName("Vũ");
    }

    RateFeeBand band(int min, Integer max, String pct) {
        RateFeeBand b = new RateFeeBand();
        b.setKind(FeeBandKind.CANCELLATION);
        b.setMinDays((short) min);
        b.setMaxDays(max == null ? null : max.shortValue());
        b.setValue(new BigDecimal(pct));
        return b;
    }

    /** v1 issued with a groom override and a manual line, the request quoted. */
    Quotation issuedV1() {
        Quotation q = startedWithIds();
        service.override(yen, request.getId(), lineKeyed("GROOM").getId(), override("1200.00"));
        service.addLine(yen, request.getId(), ferry("90.00", RateCertainty.FIXED, null));
        issue.issue(yen, request.getId(), new IssueRequest(null));
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(q));
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenReturn(List.of(q));
        return q;
    }

    @Test
    void theCustomerSeesTheIssuedVersionWithItsTermsAndTags() {
        Quotation q = issuedV1();

        CustomerQuotationResponse r = customer.get(bookings, request.getId());

        assertThat(r.code()).isEqualTo("Q-2026-0189");
        assertThat(r.versionNo()).isEqualTo((short) 1);
        assertThat(r.status()).isEqualTo(QuotationStatus.ISSUED);
        assertThat(r.validUntil()).isEqualTo(Instant.parse("2026-10-27T16:59:59.999Z"));
        assertThat(r.pinnedVersionNo()).isEqualTo(2);
        assertThat(r.request().code()).isEqualTo("REQ-2026-0199");
        assertThat(r.request().fromCity()).isEqualTo("Phnom Penh");
        assertThat(r.totals().total()).isEqualByComparingTo(q.getTotal());
        assertThat(r.deposit().pct()).isEqualByComparingTo("30");
        assertThat(r.stallNote()).startsWith("Nightfall and Shadowfax fly business class");
        assertThat(r.preparedBy().name()).isEqualTo("Vũ Thị Yến");
        assertThat(r.preparedBy().role()).isEqualTo("logistics manager");
        assertThat(r.latePenalty()).isNull();
    }

    @Test
    void overrideAndManualReasonsReachTheCustomer() {
        issuedV1();

        CustomerQuotationResponse r = customer.get(bookings, request.getId());

        List<CustomerQuotationResponse.Line> lines =
                r.groups().stream().flatMap(g -> g.lines().stream()).toList();
        CustomerQuotationResponse.Line groom = lines.stream()
                .filter(l -> l.description().equals("Flying groom"))
                .findFirst()
                .orElseThrow();
        assertThat(groom.overridden()).isTrue();
        assertThat(groom.catalogAmount()).isEqualByComparingTo("1450.00");
        assertThat(groom.amount()).isEqualByComparingTo("1200.00");
        assertThat(groom.overrideReason()).isEqualTo("Groom from the club's own staff");
        CustomerQuotationResponse.Line ferry = lines.stream()
                .filter(l -> l.description().equals("Ferry booking fee"))
                .findFirst()
                .orElseThrow();
        assertThat(ferry.manual()).isTrue();
        assertThat(ferry.manualReason()).isEqualTo("Ferry booking the catalog doesn't know");
    }

    @Test
    void theCustomerSeesTheLatestIssuedVersionNotTheDraft() {
        Quotation v1 = issuedV1();
        Quotation v2 = issued();
        v2.setVersionNo((short) 2);
        v2.setStatus(QuotationStatus.DRAFT);
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenReturn(List.of(v2, v1));

        CustomerQuotationResponse r = customer.get(bookings, request.getId());

        assertThat(r.versionNo()).isEqualTo((short) 1);
        assertThat(r.versions())
                .extracting(CustomerQuotationResponse.Version::versionNo)
                .containsExactly((short) 1);
    }

    @Test
    void nextVersionNamesTheDraft() {
        Quotation v1 = issuedV1();
        Quotation v2 = issued();
        v2.setVersionNo((short) 2);
        v2.setStatus(QuotationStatus.DRAFT);
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenReturn(List.of(v2, v1));

        assertThat(customer.get(bookings, request.getId()).nextVersion()).isEqualTo(2);
    }

    @Test
    void nextVersionIsNullWithoutADraft() {
        Quotation v1 = issuedV1();
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenReturn(List.of(v1));

        assertThat(customer.get(bookings, request.getId()).nextVersion()).isNull();
    }

    @Test
    void versionsAreIssuedOnlyNewestFirstWithTheirReasons() {
        Quotation v2 = issuedV1();
        v2.setVersionNo((short) 2);
        Quotation v1 = issued();
        v1.setStatus(QuotationStatus.SUPERSEDED);
        v1.setSupersededReason("Departure moved from 12 Nov to 20 Nov.");
        Quotation v3 = issued();
        v3.setVersionNo((short) 3);
        v3.setStatus(QuotationStatus.DRAFT);
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenReturn(List.of(v3, v2, v1));

        CustomerQuotationResponse r = customer.get(bookings, request.getId());

        assertThat(r.versions())
                .extracting(CustomerQuotationResponse.Version::versionNo)
                .containsExactly((short) 2, (short) 1);
        assertThat(r.versions().get(1).supersededReason()).isEqualTo("Departure moved from 12 Nov to 20 Nov.");
    }

    @Test
    void noIssuedVersionIsNotFound() {
        startedWithIds();

        assertThatThrownBy(() -> customer.get(bookings, request.getId()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("not issued");
    }

    @Test
    void anotherClubsRequestIsNotFound() {
        issuedV1();
        User other = new User();
        Club otherClub = new Club();
        otherClub.setId(UUID.randomUUID());
        when(clubs.requireClub(other)).thenReturn(otherClub);

        assertThatThrownBy(() -> customer.get(other, request.getId())).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void theEstimateVerdict() {
        Quotation q = issuedV1();
        BigDecimal total = q.getTotal();

        request.setEstimateLow(total.subtract(BigDecimal.TEN));
        request.setEstimateHigh(total.add(BigDecimal.TEN));
        assertThat(customer.get(bookings, request.getId()).estimate().inside()).isTrue();

        request.setEstimateLow(total.add(BigDecimal.ONE));
        request.setEstimateHigh(total.add(BigDecimal.TEN));
        CustomerQuotationResponse.Estimate outside =
                customer.get(bookings, request.getId()).estimate();
        assertThat(outside.inside()).isFalse();
        assertThat(outside.low()).isEqualByComparingTo(total.add(BigDecimal.ONE));

        request.setEstimateLow(null);
        request.setEstimateHigh(null);
        assertThat(customer.get(bookings, request.getId()).estimate()).isNull();
    }

    @Test
    void theCurrentCancellationBand() {
        issuedV1();

        CustomerQuotationResponse.Cancellation c =
                customer.get(bookings, request.getId()).cancellation();

        // Departs 20 Nov; today is 20 Oct in Ho Chi Minh City: 31 days.
        assertThat(c.daysToDeparture()).isEqualTo(31);
        assertThat(c.bands())
                .extracting(CustomerQuotationResponse.Band::current)
                .containsExactly(false, false, false, true);

        CustomerQuotationService twoDaysLater = new CustomerQuotationService(
                requests,
                quotations,
                feeBands,
                clubs,
                snapshots,
                audit,
                notifications,
                mock(InvoiceService.class),
                issue,
                Clock.fixed(Instant.parse("2026-10-22T04:00:00Z"), BusinessTime.ZONE));
        CustomerQuotationResponse.Cancellation boundary =
                twoDaysLater.get(bookings, request.getId()).cancellation();
        assertThat(boundary.daysToDeparture()).isEqualTo(29);
        assertThat(boundary.bands())
                .extracting(CustomerQuotationResponse.Band::current)
                .containsExactly(false, false, true, false);
    }

    @Test
    void theBandFollowsTheDepartureAsQuotedNotAsEditedLater() {
        issuedV1();
        request.setDepartureDate(LocalDate.of(2026, 10, 30));

        // The snapshot holds 20 Nov, so the notice is still 31 days.
        assertThat(customer.get(bookings, request.getId()).cancellation().daysToDeparture())
                .isEqualTo(31);
    }

    @Test
    void aQuotationIssuedBeforeSnapshotsReadsFromItsStoredTotals() {
        Quotation seeded = issued();
        seeded.setStatus(QuotationStatus.ACCEPTED);
        seeded.setSubtotal(new BigDecimal("6000.00"));
        seeded.setContingency(new BigDecimal("300.00"));
        seeded.setServiceFee(new BigDecimal("756.00"));
        seeded.setTotal(new BigDecimal("7056.00"));
        seeded.setDepositPct(new BigDecimal("30"));
        seeded.setDepositAmount(new BigDecimal("2116.80"));
        stored = Optional.of(seeded);
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(seeded));
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenReturn(List.of(seeded));

        CustomerQuotationResponse r = customer.get(bookings, request.getId());

        assertThat(r.totals().rows()).extracting(row -> row.key()).containsExactly("CONTINGENCY", "SERVICE_FEE");
        assertThat(r.totals().rows().getFirst().label()).isEqualTo("Contingency");
        assertThat(r.request().fromCity()).isEqualTo("Phnom Penh");
        assertThat(r.cancellation().daysToDeparture()).isEqualTo(31);
        assertThat(service.get(request.getId()).totals().rows())
                .extracting(row -> row.amount())
                .containsExactly(new BigDecimal("300.00"), new BigDecimal("756.00"));
    }

    @Test
    void aSeededQuotationWithoutADepositSaysNone() {
        Quotation seeded = issued();
        seeded.setStatus(QuotationStatus.ACCEPTED);
        seeded.setTotal(new BigDecimal("4200.00"));
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(seeded));

        assertThat(customer.get(bookings, request.getId()).deposit()).isNull();
    }

    @Test
    void anIssuedReadIgnoresLaterRequestAndCatalogChanges() {
        Quotation q = issuedV1();
        List<String> bases = snapshots.read(q.getIssuedSnapshot()).rows().stream()
                .map(r -> r.baseText())
                .toList();
        horses.remove(1);
        request.setStatus(RequestStatus.CANCELLED);
        clearInvocations(loader, inputs);

        CustomerQuotationResponse r = customer.get(bookings, request.getId());

        assertThat(r.totals().rows()).extracting(row -> row.baseText()).containsExactlyElementsOf(bases);
        assertThat(r.request().horses()).hasSize(2);
        verifyNoInteractions(loader, inputs);
    }
}
