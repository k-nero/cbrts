package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.AuditLog;
import com.equifreight.entity.Club;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.Horse;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.Place;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateFeeBand;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.RequestRevision;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.FeeBandKind;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.request.Blocker;
import com.equifreight.model.request.RequestDraftRequest;
import com.equifreight.model.request.RequestHorseInput;
import com.equifreight.model.request.RequestHorseResponse;
import com.equifreight.model.request.RequestResponse;
import com.equifreight.model.request.RequestSummaryResponse;
import com.equifreight.model.route.RouteResponse;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.RequestRevisionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import tools.jackson.databind.json.JsonMapper;

/** Spec R-01 to R-05, R-08 and R-09: building and editing a draft request. */
class RequestServiceTest {

    static final UUID CLUB_ID = UUID.fromString("01a1453c-0000-7000-8000-000000000001");
    static final Instant NOW = Instant.parse("2026-09-26T02:14:00Z");

    TransportRequestRepository requests;
    HorseRepository horses;
    PlaceRepository places;
    RequestRevisionRepository revisions;
    RouteService routes;
    ClubService clubs;
    CodeService codes;
    AuditService audit;
    AuditLogRepository auditLogs;
    RequestEstimator estimator;
    QuotationRepository quotations;
    RateFeeBandRepository feeBands;
    UserRepository users;
    NotificationService notifications;
    RequestService service;
    User user;
    Club club;
    Horse shadowfax;
    Horse nightfall;
    Horse copperKing;
    Horse silverBell;
    Place phuTho;
    Place chaoPhraya;

    @BeforeEach
    void setUp() {
        requests = mock(TransportRequestRepository.class);
        horses = mock(HorseRepository.class);
        places = mock(PlaceRepository.class);
        revisions = mock(RequestRevisionRepository.class);
        routes = mock(RouteService.class);
        clubs = mock(ClubService.class);
        codes = mock(CodeService.class);
        audit = mock(AuditService.class);
        auditLogs = mock(AuditLogRepository.class);
        estimator = mock(RequestEstimator.class);
        quotations = mock(QuotationRepository.class);
        feeBands = mock(RateFeeBandRepository.class);
        users = mock(UserRepository.class);
        notifications = mock(NotificationService.class);
        service = new RequestService(
                requests,
                horses,
                places,
                revisions,
                routes,
                clubs,
                codes,
                audit,
                auditLogs,
                JsonMapper.builder().build(),
                Clock.fixed(NOW, BusinessTime.ZONE),
                estimator,
                quotations,
                feeBands,
                users,
                notifications);

        club = new Club();
        club.setId(CLUB_ID);
        club.setName("Saigon Turf Club");
        user = new User();
        user.setId(UUID.randomUUID());
        when(clubs.requireClub(user)).thenReturn(club);

        shadowfax = horse("Shadowfax", HorseSex.GELDING, "85000");
        nightfall = horse("Nightfall", HorseSex.MARE, "240000");
        copperKing = horse("Copper King", HorseSex.STALLION, "120000");
        silverBell = horse("Silver Bell", HorseSex.MARE, "60000");
        List<Horse> all = List.of(shadowfax, nightfall, copperKing, silverBell);
        when(horses.findByClubIdAndIdIn(eq(CLUB_ID), anyCollection())).thenAnswer(inv -> {
            Collection<UUID> ids = inv.getArgument(1);
            return all.stream().filter(h -> ids.contains(h.getId())).toList();
        });

        phuTho = place("Phú Thọ training centre", "Ho Chi Minh City");
        chaoPhraya = place("Chao Phraya Racing Stables", "Bangkok");
        when(places.findById(phuTho.getId())).thenReturn(Optional.of(phuTho));
        when(places.findById(chaoPhraya.getId())).thenReturn(Optional.of(chaoPhraya));

        when(routes.resolve(any(), any(), any(), any(), any())).thenReturn(RouteResolution.none());
        org.mockito.stubbing.Answer<TransportRequest> withId = inv -> {
            TransportRequest r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(UUID.randomUUID());
            }
            return r;
        };
        when(requests.save(any(TransportRequest.class))).thenAnswer(withId);
        when(requests.saveAndFlush(any(TransportRequest.class))).thenAnswer(withId);
    }

    @Test
    void createSavesADraftForTheCallersClub() {
        RequestResponse response = service.create(user, body(shadowfax, nightfall));

        TransportRequest saved = savedRequest();
        assertThat(saved.getStatus()).isEqualTo(RequestStatus.DRAFT);
        assertThat(saved.getClub()).isSameAs(club);
        assertThat(saved.getCreatedBy()).isSameAs(user);
        assertThat(saved.getCode()).isNull();
        RequestHorse snapshot = saved.getHorses().stream()
                .filter(rh -> rh.getHorse() == nightfall)
                .findFirst()
                .orElseThrow();
        assertThat(snapshot.getDeclaredValue()).isEqualByComparingTo("240000");
        assertThat(snapshot.getSex()).isEqualTo(HorseSex.MARE);
        assertThat(snapshot.getSizeClassCode()).isEqualTo("M");
        assertThat(snapshot.getRequiredStall()).isEqualTo(StallType.CLIMATE);
        assertThat(response.horses()).extracting(RequestHorseResponse::name).containsExactly("Nightfall", "Shadowfax");
        assertThat(response.status()).isEqualTo(RequestStatus.DRAFT);
    }

    @Test
    void createAnswersWithTheTimestampsItsSaveWrote() {
        Instant written = Instant.parse("2026-10-18T03:00:00Z");
        when(requests.saveAndFlush(any(TransportRequest.class))).thenAnswer(inv -> {
            TransportRequest r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            r.setCreatedAt(written);
            r.setUpdatedAt(written);
            return r;
        });

        RequestResponse response = service.create(user, body(shadowfax));

        assertThat(response.createdAt()).isEqualTo(written);
        assertThat(response.updatedAt()).isEqualTo(written);
    }

    @Test
    void anotherClubsHorseAnswers404() {
        UUID stranger = UUID.randomUUID();
        RequestDraftRequest body = RequestDraftRequest.builder()
                .horses(List.of(input(stranger, false)))
                .build();

        assertThatThrownBy(() -> service.create(user, body))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Horse not found: " + stranger);
        verify(requests, never()).saveAndFlush(any());
    }

    @Test
    void aHorseListedTwiceIsRefused() {
        assertThatThrownBy(() -> service.create(user, body(shadowfax, shadowfax)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Shadowfax is on the request twice.")
                .extracting("code")
                .isEqualTo("HORSE_LISTED_TWICE");
    }

    @Test
    void addingAnArchivedHorseIsRefused() {
        silverBell.setArchivedAt(NOW);

        assertThatThrownBy(() -> service.create(user, body(silverBell)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Silver Bell is archived and can't be added to a request.")
                .extracting("code")
                .isEqualTo("HORSE_ARCHIVED");
    }

    @Test
    void anArchivedHorseAlreadyOnTheDraftIsKept() {
        TransportRequest draft = draft(silverBell);
        silverBell.setArchivedAt(NOW);

        RequestResponse response = service.update(user, draft.getId(), body(silverBell));

        assertThat(response.horses())
                .singleElement()
                .satisfies(h -> assertThat(h.archived()).isTrue());
        verify(requests).saveAndFlush(draft);
    }

    @Test
    void aFoalIsOnlyForAMare() {
        RequestDraftRequest gelding = RequestDraftRequest.builder()
                .horses(List.of(input(shadowfax.getId(), true)))
                .build();
        assertThatThrownBy(() -> service.create(user, gelding))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only a mare can travel with a foal at foot; Shadowfax is a gelding.")
                .extracting("code")
                .isEqualTo("FOAL_NOT_A_MARE");

        RequestDraftRequest mare = RequestDraftRequest.builder()
                .horses(List.of(input(nightfall.getId(), true)))
                .build();
        service.create(user, mare);
        assertThat(savedRequest().getHorses().getFirst().isWithFoal()).isTrue();
    }

    @Test
    void updateReplacesTheHorseList() {
        TransportRequest draft = draft(shadowfax, nightfall);

        RequestResponse response = service.update(user, draft.getId(), body(nightfall, copperKing));

        assertThat(draft.getHorses())
                .extracting(rh -> rh.getHorse().getName())
                .containsExactlyInAnyOrder("Nightfall", "Copper King");
        assertThat(response.horses())
                .extracting(RequestHorseResponse::name)
                .containsExactly("Copper King", "Nightfall");
    }

    @Test
    void anEndIsAPlaceOrATextNotBoth() {
        RequestDraftRequest origin = body().toBuilder()
                .originPlaceId(phuTho.getId())
                .originText("Ho Chi Minh City")
                .build();
        assertRefused(origin, "PLACE_OR_TEXT", "Choose a place or type a city for the origin, not both.");

        RequestDraftRequest destination = body().toBuilder()
                .destinationPlaceId(chaoPhraya.getId())
                .destinationText("Bangkok")
                .build();
        assertRefused(destination, "PLACE_OR_TEXT", "Choose a place or type a city for the destination, not both.");
    }

    @Test
    void anUnknownPlaceAnswers404() {
        UUID unknown = UUID.randomUUID();
        RequestDraftRequest body =
                body().toBuilder().destinationPlaceId(unknown).build();

        assertThatThrownBy(() -> service.create(user, body))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Place not found: " + unknown);
    }

    @Test
    void theSamePlaceTwiceIsRefused() {
        RequestDraftRequest body = body().toBuilder()
                .originPlaceId(phuTho.getId())
                .destinationPlaceId(phuTho.getId())
                .build();

        assertRefused(body, "SAME_PLACE", "The horses can't be collected and delivered at the same place.");
    }

    @Test
    void textsAreTrimmedAndBlankIsNull() {
        RequestDraftRequest body = body().toBuilder()
                .originText(" Singapore ")
                .destinationText("  ")
                .specialInstructions("  Quiet loading. ")
                .build();

        service.create(user, body);

        TransportRequest saved = savedRequest();
        assertThat(saved.getOriginText()).isEqualTo("Singapore");
        assertThat(saved.getDestinationText()).isNull();
        assertThat(saved.getSpecialInstructions()).isEqualTo("Quiet loading.");
    }

    @Test
    void roadWithAnAirClassOrAirWithATrailerIsRefused() {
        RequestDraftRequest road = body().toBuilder()
                .mode(TransportMode.ROAD)
                .airClass(ServiceClass.BUSINESS)
                .build();
        assertRefused(road, "MODE_OPTIONS", "Air moves have no trailer, and road moves have no air class.");

        RequestDraftRequest air = body().toBuilder()
                .mode(TransportMode.AIR)
                .trailer(TrailerType.SHARED)
                .build();
        assertRefused(air, "MODE_OPTIONS", "Air moves have no trailer, and road moves have no air class.");
    }

    @Test
    void aTrailerAndAnAirClassWithoutAModeAreRefused() {
        RequestDraftRequest body = body().toBuilder()
                .trailer(TrailerType.SHARED)
                .airClass(ServiceClass.BUSINESS)
                .build();

        assertRefused(body, "MODE_OPTIONS", "Air moves have no trailer, and road moves have no air class.");
    }

    @Test
    void aWelfareStopIsNotAnEnd() {
        Place welfare = place("Svay Rieng welfare stop", "Svay Rieng");
        welfare.setKind(PlaceKind.WELFARE_STOP);
        when(places.findById(welfare.getId())).thenReturn(Optional.of(welfare));
        RequestDraftRequest body =
                body().toBuilder().originPlaceId(welfare.getId()).build();

        assertRefused(
                body,
                "PLACE_NOT_AN_END",
                "Svay Rieng welfare stop is a stop on the way, not a pickup or delivery point.");
    }

    @Test
    void flexIsZeroToSevenDays() {
        RequestDraftRequest eight = body().toBuilder().dateFlexDays(8).build();
        assertRefused(eight, "DATE_FLEX", "Dates can move by 0 to 7 days; 8 was given.");
        RequestDraftRequest negative = body().toBuilder().dateFlexDays(-1).build();
        assertRefused(negative, "DATE_FLEX", "Dates can move by 0 to 7 days; -1 was given.");

        service.create(user, body());
        assertThat(savedRequest().getDateFlexDays()).isZero();
    }

    @Test
    void aFlexibleDraftTakesItsRoutesFlexDays() {
        Corridor hcmBkk = new Corridor();
        hcmBkk.setCode("RD HCM → BKK");
        hcmBkk.setDateFlexDays((short) 5);
        when(routes.resolve(phuTho, null, chaoPhraya, null, TransportMode.ROAD))
                .thenReturn(new RouteResolution(hcmBkk, route(21), Set.of(TransportMode.ROAD), null, false, false));
        RequestDraftRequest body = body(shadowfax).toBuilder()
                .originPlaceId(phuTho.getId())
                .destinationPlaceId(chaoPhraya.getId())
                .mode(TransportMode.ROAD)
                .dateFlexDays(3)
                .build();

        RequestResponse response = service.create(user, body);

        assertThat(savedRequest().getDateFlexDays()).isEqualTo((short) 5);
        assertThat(response.dateFlexDays()).isEqualTo(5);
    }

    @Test
    void aWindowNeedsRoadAPrivateTrailerAndFixedDates() {
        String message = "An arrival window needs a road move with a private trailer and fixed dates. Choose road "
                + "and a private trailer, and untick ±3 days, or arrive any time on the day.";
        RequestDraftRequest air = window("08:00", "12:00").toBuilder()
                .mode(TransportMode.AIR)
                .trailer(null)
                .build();
        assertRefused(air, "ARRIVAL_WINDOW", message);

        RequestDraftRequest shared =
                window("08:00", "12:00").toBuilder().trailer(TrailerType.SHARED).build();
        assertRefused(shared, "ARRIVAL_WINDOW", message);

        RequestDraftRequest flexible =
                window("08:00", "12:00").toBuilder().dateFlexDays(3).build();
        assertRefused(flexible, "ARRIVAL_WINDOW", message);
    }

    @Test
    void aWindowNeedsBothTimes() {
        RequestDraftRequest body =
                window("08:00", "12:00").toBuilder().windowEnd(null).build();

        assertRefused(body, "ARRIVAL_WINDOW", "An arrival window needs both a start and an end.");
    }

    @Test
    void aWindowMustEndAfterItStarts() {
        assertRefused(window("12:00", "08:00"), "ARRIVAL_WINDOW", "The arrival window ends before it starts.");
    }

    @Test
    void aWindowIsAtLeastThreeHours() {
        assertRefused(
                window("08:00", "10:30"),
                "ARRIVAL_WINDOW",
                "An arrival window is at least 3 hours; 08:00–10:30 is shorter.");

        service.create(user, window("08:00", "11:00"));
        assertThat(savedRequest().getArrivalMode()).isEqualTo(ArrivalMode.WINDOW);
    }

    @Test
    void anyTimeTakesNoWindowTimes() {
        RequestDraftRequest body = window("08:00", "12:00").toBuilder()
                .arrivalMode(ArrivalMode.ANY_TIME)
                .build();

        assertRefused(body, "ARRIVAL_WINDOW", "Arrival any time on the day takes no window times.");
    }

    @Test
    void theCorridorIsResolvedOnSave() {
        Corridor hcmBkk = new Corridor();
        hcmBkk.setCode("RD HCM → BKK");
        when(routes.resolve(phuTho, null, chaoPhraya, null, TransportMode.ROAD))
                .thenReturn(new RouteResolution(hcmBkk, route(21), Set.of(TransportMode.ROAD), null, false, false));
        RequestDraftRequest body = body(shadowfax).toBuilder()
                .originPlaceId(phuTho.getId())
                .destinationPlaceId(chaoPhraya.getId())
                .mode(TransportMode.ROAD)
                .build();

        RequestResponse response = service.create(user, body);

        assertThat(savedRequest().getCorridor()).isSameAs(hcmBkk);
        assertThat(response.route().code()).isEqualTo("RD HCM → BKK");
    }

    @Test
    void aDraftCarriesItsLeadTime() {
        when(routes.resolve(any(), any(), any(), any(), any()))
                .thenReturn(
                        new RouteResolution(new Corridor(), route(21), Set.of(TransportMode.ROAD), null, false, false));
        RequestDraftRequest body = body(shadowfax).toBuilder()
                .departureDate(LocalDate.of(2026, 10, 30))
                .build();

        RequestResponse response = service.create(user, body);

        assertThat(response.leadTime().requiredDays()).isEqualTo(21);
        assertThat(response.leadTime().earliestDeparture()).isEqualTo(LocalDate.of(2026, 10, 17));
        assertThat(response.leadTime().daysBeforeDeparture()).isEqualTo(34);
        assertThat(response.leadTime().met()).isTrue();
    }

    @Test
    void editingASubmittedRequestIsRefused() {
        TransportRequest submitted = submitted();

        assertThatThrownBy(() -> service.update(user, submitted.getId(), body()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("REQ-2026-0001 was submitted on 17 Oct 2026 and can't be edited here.")
                .extracting("code")
                .isEqualTo("REQUEST_NOT_DRAFT");
        verify(requests).findForUpdate(submitted.getId(), CLUB_ID);
    }

    @Test
    void discardingASubmittedRequestIsRefused() {
        TransportRequest submitted = submitted();

        assertThatThrownBy(() -> service.delete(user, submitted.getId()))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("REQUEST_NOT_DRAFT");
        verify(requests, never()).delete(any());
    }

    @Test
    void discardDeletesADraft() {
        TransportRequest draft = draft(shadowfax);

        service.delete(user, draft.getId());

        verify(requests).delete(draft);
    }

    @Test
    void anotherClubsRequestAnswers404() {
        UUID id = UUID.randomUUID();
        when(requests.findByIdAndClubId(id, CLUB_ID)).thenReturn(Optional.empty());
        when(requests.findForUpdate(id, CLUB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(user, id)).hasMessage("Request not found: " + id);
        assertThatThrownBy(() -> service.update(user, id, body())).hasMessage("Request not found: " + id);
        assertThatThrownBy(() -> service.delete(user, id))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Request not found: " + id);
    }

    @Test
    void aSubmittedRequestHasNoBlockersOrLeadTime() {
        TransportRequest submitted = submitted();
        Corridor corridor = new Corridor();
        submitted.setCorridor(corridor);
        submitted.setOriginPlace(phuTho);
        submitted.setDestinationPlace(chaoPhraya);
        when(requests.findByIdAndClubId(submitted.getId(), CLUB_ID)).thenReturn(Optional.of(submitted));
        when(routes.describe(corridor, phuTho, chaoPhraya)).thenReturn(route(21));

        RequestResponse response = service.get(user, submitted.getId());

        assertThat(response.blockers()).isEmpty();
        assertThat(response.leadTime()).isNull();
        assertThat(response.route().code()).isEqualTo("RD HCM → BKK");
        assertThat(response.code()).isEqualTo("REQ-2026-0001");
    }

    @Test
    void listCountsHorsesForThePage() {
        TransportRequest first = draft(shadowfax, nightfall);
        TransportRequest second = draft(copperKing);
        Pageable pageable = PageRequest.of(0, 20);
        when(requests.findByClubId(CLUB_ID, pageable)).thenReturn(new PageImpl<>(List.of(first, second)));
        when(requests.findByClubIdAndStatus(CLUB_ID, RequestStatus.DRAFT, pageable))
                .thenReturn(new PageImpl<>(List.of(second)));
        when(requests.countHorses(anyCollection()))
                .thenReturn(List.of(count(first.getId(), 2), count(second.getId(), 1)));

        Page<RequestSummaryResponse> page = service.list(user, null, pageable);

        assertThat(page.getContent())
                .extracting(RequestSummaryResponse::horseCount)
                .containsExactly(2L, 1L);
        assertThat(service.list(user, RequestStatus.DRAFT, pageable).getContent())
                .extracting(RequestSummaryResponse::id)
                .containsExactly(second.getId());
    }

    // --- slice 6: the request names its issued quotation ----------------------------------------------

    static Quotation issuedQuotation(TransportRequest r, int versionNo) {
        Quotation q = new Quotation();
        q.setId(UUID.randomUUID());
        q.setRequest(r);
        q.setCode("Q-2026-0192");
        q.setVersionNo((short) versionNo);
        q.setStatus(QuotationStatus.ISSUED);
        q.setValidUntil(Instant.parse("2026-10-27T16:59:59.999Z"));
        return q;
    }

    @Test
    void theRequestNamesItsIssuedQuotation() {
        TransportRequest quoted = submitted();
        quoted.setStatus(RequestStatus.QUOTED);
        Corridor corridor = new Corridor();
        quoted.setCorridor(corridor);
        quoted.setOriginPlace(phuTho);
        quoted.setDestinationPlace(chaoPhraya);
        when(requests.findByIdAndClubId(quoted.getId(), CLUB_ID)).thenReturn(Optional.of(quoted));
        when(routes.describe(corridor, phuTho, chaoPhraya)).thenReturn(route(21));
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(quoted.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(issuedQuotation(quoted, 2)));

        RequestResponse response = service.get(user, quoted.getId());

        assertThat(response.quotation().code()).isEqualTo("Q-2026-0192");
        assertThat(response.quotation().versionNo()).isEqualTo((short) 2);
        assertThat(response.quotation().status()).isEqualTo(QuotationStatus.ISSUED);
        assertThat(response.quotation().validUntil()).isEqualTo(Instant.parse("2026-10-27T16:59:59.999Z"));
    }

    @Test
    void aRequestWithOnlyADraftQuotationNamesNone() {
        TransportRequest inReview = submitted();
        Corridor corridor = new Corridor();
        inReview.setCorridor(corridor);
        inReview.setOriginPlace(phuTho);
        inReview.setDestinationPlace(chaoPhraya);
        when(requests.findByIdAndClubId(inReview.getId(), CLUB_ID)).thenReturn(Optional.of(inReview));
        when(routes.describe(corridor, phuTho, chaoPhraya)).thenReturn(route(21));

        assertThat(service.get(user, inReview.getId()).quotation()).isNull();
    }

    @Test
    void listRowsNameTheirLatestIssuedQuotation() {
        TransportRequest first = draft(shadowfax, nightfall);
        TransportRequest second = draft(copperKing);
        Pageable pageable = PageRequest.of(0, 20);
        when(requests.findByClubId(CLUB_ID, pageable)).thenReturn(new PageImpl<>(List.of(first, second)));
        when(requests.countHorses(anyCollection())).thenReturn(List.of());
        when(quotations.findByRequestIdInAndStatusNot(anyCollection(), eq(QuotationStatus.DRAFT)))
                .thenReturn(List.of(issuedQuotation(first, 1), issuedQuotation(first, 2)));

        Page<RequestSummaryResponse> page = service.list(user, null, pageable);

        assertThat(page.getContent().get(0).quotation().versionNo()).isEqualTo((short) 2);
        assertThat(page.getContent().get(1).quotation()).isNull();
    }

    /** Spec R-07: submitting a draft. */
    // --- an INFO_REQUIRED request (US-F1-04) ----------------------------------------------------------

    @Test
    void anInfoRequiredRequestCanBeSaved() {
        TransportRequest r = infoRequired();

        RequestResponse response = service.update(user, r.getId(), body(shadowfax));

        verify(requests).saveAndFlush(r);
        assertThat(response.status()).isEqualTo(RequestStatus.INFO_REQUIRED);
    }

    @Test
    void aSubmittedRequestStillCantBeEdited() {
        TransportRequest r = submitted();

        assertThatThrownBy(() -> service.update(user, r.getId(), body(shadowfax)))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("REQUEST_NOT_DRAFT");
    }

    @Test
    void anInfoRequiredRequestComesBackWithItsBlockers() {
        TransportRequest r = infoRequired();

        RequestResponse response = service.get(user, r.getId());

        assertThat(response.blockers()).extracting(Blocker::code).contains("ORIGIN_MISSING");
    }

    @Test
    void anInfoRequiredRequestCantBeDiscarded() {
        TransportRequest r = infoRequired();

        assertThatThrownBy(() -> service.delete(user, r.getId()))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("REQUEST_NOT_DRAFT");
        verify(requests, never()).delete(any());
    }

    @Test
    void theResponseListsRevisionsAndTheNote() {
        TransportRequest r = infoRequired();
        Instant returned = Instant.parse("2026-09-28T02:41:00Z");
        when(auditLogs.findByEntityTypeAndEntityIdAndActionOrderByOccurredAtAsc(
                        "TRANSPORT_REQUEST", r.getId(), "REQUEST_INFO_REQUIRED"))
                .thenReturn(List.of(auditAt(returned)));

        RequestResponse response = service.get(user, r.getId());

        assertThat(response.infoRequiredNote()).isEqualTo("Which stable?");
        assertThat(response.revisions()).singleElement().satisfies(v -> {
            assertThat(v.getRevisionNo()).isEqualTo((short) 1);
            assertThat(v.getNote()).isEqualTo("Which stable?");
            assertThat(v.getReturnedAt()).isEqualTo(returned);
        });
    }

    @Test
    void aDraftHasNoRevisions() {
        TransportRequest r = draft(shadowfax);

        assertThat(service.get(user, r.getId()).revisions()).isEmpty();
    }

    // --- US-F1-06, BR-F1-07: the customer cancels before approval ---------------------------------------

    @Nested
    class Cancel {

        static final UUID CATALOG_V2 = UUID.fromString("01a1453c-0000-7000-8000-0000000000c2");

        TransportRequest quoted;

        @BeforeEach
        void setUpQuoted() {
            quoted = submitted();
            quoted.setStatus(RequestStatus.QUOTED);
            // Today is 26 Sep 2026 in Ho Chi Minh City.
            quoted.setDepartureDate(LocalDate.of(2026, 10, 16));
            Quotation q = issuedQuotation(quoted, 1);
            RateCatalogVersion v2 = new RateCatalogVersion();
            v2.setId(CATALOG_V2);
            q.setRateCatalogVersion(v2);
            when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(quoted.getId(), QuotationStatus.DRAFT))
                    .thenReturn(Optional.of(q));
            when(feeBands.findByVersionIdAndKindOrderByMinDays(CATALOG_V2, FeeBandKind.CANCELLATION))
                    .thenReturn(
                            List.of(band(0, 6, "100"), band(7, 13, "50"), band(14, 29, "25"), band(30, null, "10")));
        }

        RateFeeBand band(int min, Integer max, String pct) {
            RateFeeBand b = new RateFeeBand();
            b.setKind(FeeBandKind.CANCELLATION);
            b.setMinDays((short) min);
            b.setMaxDays(max == null ? null : max.shortValue());
            b.setValue(new BigDecimal(pct));
            return b;
        }

        @Test
        void theFeeBandFollowsTheDaysLeftBeforeDeparture() {
            RequestResponse r = service.cancel(user, quoted.getId());

            // 20 days to departure: the 14-29 day band.
            assertThat(quoted.getStatus()).isEqualTo(RequestStatus.CANCELLED);
            assertThat(quoted.getCancellationFeePct()).isEqualByComparingTo("25");
            assertThat(quoted.getCancelledAt()).isEqualTo(NOW);
            assertThat(r.status()).isEqualTo(RequestStatus.CANCELLED);
            assertThat(r.cancellationFeePct()).isEqualByComparingTo("25");
            verify(requests).findForUpdate(quoted.getId(), CLUB_ID);
            verify(audit)
                    .recordDecision(
                            eq(user),
                            eq("REQUEST_CANCELLED"),
                            eq("Cancelled by Saigon Turf Club; fee 25% with 20 days to departure"),
                            eq("TRANSPORT_REQUEST"),
                            eq(quoted.getId()),
                            eq("REQ-2026-0001"),
                            isNull(),
                            eq("{\"status\":\"QUOTED\"}"),
                            eq("{\"status\":\"CANCELLED\"}"));
        }

        @Test
        void underAWeekCostsTheWholeBand() {
            quoted.setDepartureDate(LocalDate.of(2026, 9, 30));

            service.cancel(user, quoted.getId());

            assertThat(quoted.getCancellationFeePct()).isEqualByComparingTo("100");
        }

        @Test
        void anAcceptedRequestCanStillBeCancelledBeforeApproval() {
            quoted.setStatus(RequestStatus.CUSTOMER_ACCEPTED);

            service.cancel(user, quoted.getId());

            assertThat(quoted.getStatus()).isEqualTo(RequestStatus.CANCELLED);
        }

        @Test
        void withNoQuotationIssuedThereIsNoFee() {
            TransportRequest inReview = submitted();
            inReview.setStatus(RequestStatus.UNDER_REVIEW);
            inReview.setDepartureDate(LocalDate.of(2026, 10, 16));
            when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(
                            inReview.getId(), QuotationStatus.DRAFT))
                    .thenReturn(Optional.empty());

            service.cancel(user, inReview.getId());

            assertThat(inReview.getStatus()).isEqualTo(RequestStatus.CANCELLED);
            assertThat(inReview.getCancellationFeePct()).isEqualByComparingTo("0");
        }

        @Test
        void anApprovedRequestCantBeCancelled() {
            quoted.setStatus(RequestStatus.APPROVED);

            assertThatThrownBy(() -> service.cancel(user, quoted.getId()))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("is approved, so its price and horses are locked")
                    .extracting("code")
                    .isEqualTo("REQUEST_NOT_CANCELLABLE");
            assertThat(quoted.getStatus()).isEqualTo(RequestStatus.APPROVED);
            verify(requests, never()).saveAndFlush(any());
        }

        @Test
        void aDraftIsDiscardedNotCancelled() {
            TransportRequest d = draft(shadowfax);

            assertThatThrownBy(() -> service.cancel(user, d.getId()))
                    .hasMessage("A draft isn't cancelled; discard it from your requests instead.");
            assertThat(d.getStatus()).isEqualTo(RequestStatus.DRAFT);
        }

        @Test
        void aRequestIsCancelledOnlyOnce() {
            service.cancel(user, quoted.getId());
            clearInvocations(requests, audit);

            assertThatThrownBy(() -> service.cancel(user, quoted.getId()))
                    .hasMessage("REQ-2026-0001 was already cancelled on 26 Sep 2026.");
            verify(requests, never()).saveAndFlush(any());
            verify(audit, never())
                    .recordDecision(any(), anyString(), anyString(), anyString(), any(), any(), any(), any(), any());
        }

        @Test
        void anotherClubsRequestIsNotFound() {
            UUID id = UUID.randomUUID();
            when(requests.findForUpdate(id, CLUB_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.cancel(user, id)).isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    class Submit {

        TransportRequest draft;
        Corridor hcmBkk;

        @BeforeEach
        void completeDraft() {
            draft = draft(shadowfax, nightfall);
            draft.setOriginPlace(phuTho);
            draft.setDestinationPlace(chaoPhraya);
            draft.setDepartureDate(LocalDate.of(2026, 10, 30));
            draft.setMode(TransportMode.ROAD);
            draft.setTrailer(TrailerType.SHARED);
            draft.setInsurance(com.equifreight.entity.enums.InsuranceOption.OWN_POLICY);
            hcmBkk = new Corridor();
            hcmBkk.setCode("RD HCM → BKK");
            when(routes.resolve(any(), any(), any(), any(), any()))
                    .thenReturn(new RouteResolution(hcmBkk, route(21), Set.of(TransportMode.ROAD), null, false, false));
            when(codes.next(CodePrefix.REQ, 2026)).thenReturn("REQ-2026-0193");
            when(estimator.rangeFor(any()))
                    .thenReturn(com.equifreight.service.pricing.EstimateResult.range(
                            new java.math.BigDecimal("31900.00"), new java.math.BigDecimal("43300.00")));
        }

        @Test
        void submitKeepsTheEstimateShownAtSubmission() {
            RequestResponse response = service.submit(user, draft.getId());

            assertThat(draft.getEstimateLow()).isEqualByComparingTo("31900");
            assertThat(draft.getEstimateHigh()).isEqualByComparingTo("43300");
            assertThat(response.estimateLow()).isEqualByComparingTo("31900");
            assertThat(response.estimateHigh()).isEqualByComparingTo("43300");
            verify(estimator).rangeFor(draft);
        }

        @Test
        void aResubmissionReplacesTheEstimate() {
            backToTheCustomer(Instant.parse("2026-09-20T02:00:00Z"));
            draft.setEstimateLow(new java.math.BigDecimal("1000"));
            draft.setEstimateHigh(new java.math.BigDecimal("2000"));
            when(estimator.rangeFor(any()))
                    .thenReturn(com.equifreight.service.pricing.EstimateResult.range(
                            new java.math.BigDecimal("3000.00"), new java.math.BigDecimal("4000.00")));

            service.submit(user, draft.getId());

            assertThat(draft.getEstimateLow()).isEqualByComparingTo("3000");
            assertThat(draft.getEstimateHigh()).isEqualByComparingTo("4000");
        }

        @Test
        void noEstimateIsKeptWhenItIsUnavailable() {
            draft.setEstimateLow(new java.math.BigDecimal("1000"));
            draft.setEstimateHigh(new java.math.BigDecimal("2000"));
            when(estimator.rangeFor(any()))
                    .thenReturn(com.equifreight.service.pricing.EstimateResult.unavailable(
                            com.equifreight.service.pricing.EstimateStatus.UNAVAILABLE,
                            "No estimate yet: the rate catalog has no estimate band."));

            RequestResponse response = service.submit(user, draft.getId());

            assertThat(draft.getEstimateLow()).isNull();
            assertThat(draft.getEstimateHigh()).isNull();
            assertThat(response.status()).isEqualTo(RequestStatus.SUBMITTED);
        }

        @Test
        void resubmittingKeepsTheCodeAndAppendsVersion2() {
            Instant first = Instant.parse("2026-09-20T02:00:00Z");
            backToTheCustomer(first);

            RequestResponse response = service.submit(user, draft.getId());

            assertThat(response.code()).isEqualTo("REQ-2026-0195");
            verify(codes, never()).next(any(), anyInt());
            assertThat(draft.getSubmittedAt()).isEqualTo(first);
            assertThat(draft.getStatus()).isEqualTo(RequestStatus.SUBMITTED);
            assertThat(draft.getInfoRequiredNote()).isNull();
            ArgumentCaptor<RequestRevision> captor = ArgumentCaptor.forClass(RequestRevision.class);
            verify(revisions).save(captor.capture());
            assertThat(captor.getValue().getRevisionNo()).isEqualTo((short) 2);
            assertThat(captor.getValue().getNote()).isNull();
            assertThat(captor.getValue().getSubmittedAt()).isEqualTo(NOW);
            verify(audit)
                    .recordDecision(
                            eq(user),
                            eq("REQUEST_RESUBMITTED"),
                            startsWith("Sent version 2 with 2 horses: "),
                            eq("TRANSPORT_REQUEST"),
                            eq(draft.getId()),
                            eq("REQ-2026-0195"),
                            isNull(),
                            eq("{\"status\":\"INFO_REQUIRED\"}"),
                            eq("{\"status\":\"SUBMITTED\"}"));
            verify(audit)
                    .recordSystem(
                            eq("LEAD_TIME_CHECKED"),
                            startsWith("Lead time checked: "),
                            eq("TRANSPORT_REQUEST"),
                            eq(draft.getId()),
                            eq("REQ-2026-0195"),
                            isNull(),
                            isNull());
        }

        @Test
        void aBlockedResubmitWritesNothing() {
            backToTheCustomer(Instant.parse("2026-09-20T02:00:00Z"));
            draft.setDepartureDate(null);

            assertThatThrownBy(() -> service.submit(user, draft.getId()))
                    .isInstanceOf(ConflictException.class)
                    .extracting("code")
                    .isEqualTo("SUBMISSION_BLOCKED");
            verify(revisions, never()).save(any());
            verify(codes, never()).next(any(), anyInt());
            verifyNoInteractions(audit);
            assertThat(draft.getStatus()).isEqualTo(RequestStatus.INFO_REQUIRED);
        }

        void backToTheCustomer(Instant firstSubmitted) {
            draft.setStatus(RequestStatus.INFO_REQUIRED);
            draft.setCode("REQ-2026-0195");
            draft.setSubmittedAt(firstSubmitted);
            draft.setInfoRequiredNote("Which stable?");
            when(revisions.findByRequestIdOrderByRevisionNoAsc(draft.getId()))
                    .thenReturn(List.of(revision(draft, 1, "Which stable?")));
        }

        @Test
        void submitIssuesTheCodeAndSetsSubmitted() {
            RequestResponse response = service.submit(user, draft.getId());

            assertThat(response.code()).isEqualTo("REQ-2026-0193");
            assertThat(response.status()).isEqualTo(RequestStatus.SUBMITTED);
            assertThat(response.submittedAt()).isEqualTo(NOW);
            assertThat(response.blockers()).isEmpty();
            assertThat(draft.getCode()).isEqualTo("REQ-2026-0193");
            assertThat(draft.getCorridor()).isSameAs(hcmBkk);
        }

        @Test
        void submitRefreshesTheHorseSnapshots() {
            nightfall.setDeclaredValue(new BigDecimal("250000"));

            service.submit(user, draft.getId());

            assertThat(draft.getHorses())
                    .filteredOn(rh -> rh.getHorse() == nightfall)
                    .singleElement()
                    .satisfies(rh -> assertThat(rh.getDeclaredValue()).isEqualByComparingTo("250000"));
        }

        @Test
        void submitWritesRevisionOne() {
            service.submit(user, draft.getId());

            ArgumentCaptor<RequestRevision> captor = ArgumentCaptor.forClass(RequestRevision.class);
            verify(revisions).save(captor.capture());
            RequestRevision revision = captor.getValue();
            assertThat(revision.getRequest()).isSameAs(draft);
            assertThat(revision.getRevisionNo()).isEqualTo((short) 1);
            assertThat(revision.getSubmittedAt()).isEqualTo(NOW);
            assertThat(revision.getPayload())
                    .contains("\"code\":\"REQ-2026-0193\"")
                    .contains("\"status\":\"SUBMITTED\"");
        }

        @Test
        void submitWritesTheTwoAuditRows() {
            service.submit(user, draft.getId());

            verify(audit)
                    .recordDecision(
                            user,
                            "REQUEST_SUBMITTED",
                            "Submitted with 2 horses: Nightfall, Shadowfax.",
                            "TRANSPORT_REQUEST",
                            draft.getId(),
                            "REQ-2026-0193",
                            null,
                            "{\"status\":\"DRAFT\"}",
                            "{\"status\":\"SUBMITTED\"}");
            verify(audit)
                    .recordSystem(
                            "LEAD_TIME_CHECKED",
                            "Lead time checked: 34 days before departure, 21 required.",
                            "TRANSPORT_REQUEST",
                            draft.getId(),
                            "REQ-2026-0193",
                            null,
                            null);
        }

        @Test
        void submitCopiesTheRoutesCurrentFlexDays() {
            draft.setDateFlexDays((short) 3);
            hcmBkk.setDateFlexDays((short) 5);

            RequestResponse response = service.submit(user, draft.getId());

            assertThat(draft.getDateFlexDays()).isEqualTo((short) 5);
            assertThat(response.dateFlexDays()).isEqualTo(5);
            verify(audit)
                    .recordSystem(
                            "LEAD_TIME_CHECKED",
                            "Lead time checked: 34 days before departure, 21 required, plus 5 for dates that can move by ±5 days.",
                            "TRANSPORT_REQUEST",
                            draft.getId(),
                            "REQ-2026-0193",
                            null,
                            null);
        }

        @Test
        void aRouteOnFixedDatesOnlyMakesTheRequestFixed() {
            draft.setDateFlexDays((short) 3);
            hcmBkk.setDateFlexDays((short) 0);

            service.submit(user, draft.getId());

            assertThat(draft.getDateFlexDays()).isZero();
        }

        @Test
        void theLeadTimeAuditRowCountsTheDateFlex() {
            draft.setDateFlexDays((short) 3);

            service.submit(user, draft.getId());

            verify(audit)
                    .recordSystem(
                            "LEAD_TIME_CHECKED",
                            "Lead time checked: 34 days before departure, 21 required, plus 3 for dates that can move by ±3 days.",
                            "TRANSPORT_REQUEST",
                            draft.getId(),
                            "REQ-2026-0193",
                            null,
                            null);
        }

        @Test
        void aLongHorseListIsCappedInTheAuditSummary() {
            draft.getHorses().clear();
            for (int i = 1; i <= 40; i++) {
                Horse h = horse(
                        String.format("Horse %02d of the Saigon Turf Club long-distance string", i),
                        HorseSex.GELDING,
                        "50000");
                RequestHorse rh = new RequestHorse();
                rh.setRequest(draft);
                rh.setHorse(h);
                draft.getHorses().add(rh);
            }

            service.submit(user, draft.getId());

            ArgumentCaptor<String> summary = ArgumentCaptor.forClass(String.class);
            verify(audit)
                    .recordDecision(
                            eq(user),
                            eq("REQUEST_SUBMITTED"),
                            summary.capture(),
                            any(),
                            any(),
                            any(),
                            any(),
                            any(),
                            any());
            assertThat(summary.getValue())
                    .hasSizeLessThanOrEqualTo(500)
                    .startsWith("Submitted with 40 horses: Horse 01 of the Saigon Turf Club long-distance string, ")
                    .matches(".* and \\d+ more\\.$");
        }

        @Test
        void oneHorseIsSingular() {
            draft.getHorses().removeIf(rh -> rh.getHorse() == shadowfax);

            service.submit(user, draft.getId());

            verify(audit)
                    .recordDecision(
                            eq(user),
                            eq("REQUEST_SUBMITTED"),
                            eq("Submitted with 1 horse: Nightfall."),
                            any(),
                            any(),
                            any(),
                            any(),
                            any(),
                            any());
        }

        @Test
        void aBlockedSubmitListsEveryBlockerAndSavesNothing() {
            draft.getHorses().clear();
            draft.setMode(null);
            draft.setTrailer(null);

            assertThatThrownBy(() -> service.submit(user, draft.getId()))
                    .isInstanceOf(ConflictException.class)
                    .hasMessage("This request can't be submitted yet.")
                    .satisfies(e -> {
                        ConflictException conflict = (ConflictException) e;
                        assertThat(conflict.getCode()).isEqualTo("SUBMISSION_BLOCKED");
                        assertThat(conflict.getDetails()).contains("Add at least one horse.", "Choose road or air.");
                    });
            verifyNoInteractions(codes, revisions, audit);
            verify(requests, never()).save(any());
            assertThat(draft.getStatus()).isEqualTo(RequestStatus.DRAFT);
        }

        @Test
        void submittingANonDraftIsRefused() {
            TransportRequest submitted = submitted();

            assertThatThrownBy(() -> service.submit(user, submitted.getId()))
                    .isInstanceOf(ConflictException.class)
                    .extracting("code")
                    .isEqualTo("REQUEST_NOT_DRAFT");
        }

        @Test
        void submitReadsTheRequestWithARowLock() {
            service.submit(user, draft.getId());

            verify(requests).findForUpdate(draft.getId(), CLUB_ID);
            verify(requests, never()).findByIdAndClubId(any(), any());
        }

        @Test
        void theCodeYearIsTakenInBusinessTime() {
            service = new RequestService(
                    requests,
                    horses,
                    places,
                    revisions,
                    routes,
                    clubs,
                    codes,
                    audit,
                    auditLogs,
                    JsonMapper.builder().build(),
                    Clock.fixed(Instant.parse("2026-12-31T17:30:00Z"), BusinessTime.ZONE),
                    estimator,
                    quotations,
                    feeBands,
                    users,
                    notifications);
            draft.setDepartureDate(LocalDate.of(2027, 2, 15));
            when(codes.next(CodePrefix.REQ, 2027)).thenReturn("REQ-2027-0001");

            assertThat(service.submit(user, draft.getId()).code()).isEqualTo("REQ-2027-0001");
            verify(codes).next(CodePrefix.REQ, 2027);
        }
    }

    // --- helpers -------------------------------------------------------------------------------------------

    TransportRequest savedRequest() {
        org.mockito.ArgumentCaptor<TransportRequest> captor =
                org.mockito.ArgumentCaptor.forClass(TransportRequest.class);
        verify(requests, org.mockito.Mockito.atLeastOnce()).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    void assertRefused(RequestDraftRequest body, String code, String message) {
        assertThatThrownBy(() -> service.create(user, body))
                .isInstanceOf(BusinessException.class)
                .hasMessage(message)
                .extracting("code")
                .isEqualTo(code);
    }

    RequestDraftRequest body(Horse... list) {
        RequestDraftRequest body = RequestDraftRequest.builder().build().toBuilder()
                .horses(new ArrayList<>(
                        Arrays.stream(list).map(h -> input(h.getId(), false)).toList()))
                .build();
        return body;
    }

    RequestDraftRequest window(String from, String until) {
        RequestDraftRequest body = body().toBuilder()
                .mode(TransportMode.ROAD)
                .trailer(TrailerType.PRIVATE)
                .dateFlexDays(0)
                .arrivalMode(ArrivalMode.WINDOW)
                .windowStart(OffsetDateTime.parse("2026-10-31T" + from + ":00+07:00"))
                .windowEnd(OffsetDateTime.parse("2026-10-31T" + until + ":00+07:00"))
                .build();
        return body;
    }

    static RequestHorseInput input(UUID horseId, boolean withFoal) {
        RequestHorseInput input =
                RequestHorseInput.builder().horseId(horseId).withFoal(withFoal).build();
        return input;
    }

    TransportRequest draft(Horse... list) {
        TransportRequest r = new TransportRequest();
        r.setId(UUID.randomUUID());
        r.setClub(club);
        r.setStatus(RequestStatus.DRAFT);
        for (Horse h : list) {
            RequestHorse rh = new RequestHorse();
            rh.setRequest(r);
            rh.setHorse(h);
            rh.setSex(h.getSex());
            rh.setDeclaredValue(h.getDeclaredValue());
            rh.setSizeClassCode(h.getSizeClass().getCode());
            rh.setRequiredStall(h.getRequiredStall());
            r.getHorses().add(rh);
        }
        when(requests.findForUpdate(r.getId(), CLUB_ID)).thenReturn(Optional.of(r));
        when(requests.findByIdAndClubId(r.getId(), CLUB_ID)).thenReturn(Optional.of(r));
        return r;
    }

    TransportRequest infoRequired() {
        TransportRequest r = draft(shadowfax);
        r.setStatus(RequestStatus.INFO_REQUIRED);
        r.setCode("REQ-2026-0195");
        r.setSubmittedAt(Instant.parse("2026-09-20T02:00:00Z"));
        r.setInfoRequiredNote("Which stable?");
        when(revisions.findByRequestIdOrderByRevisionNoAsc(r.getId()))
                .thenReturn(List.of(revision(r, 1, "Which stable?")));
        return r;
    }

    static RequestRevision revision(TransportRequest r, int no, String note) {
        RequestRevision revision = new RequestRevision();
        revision.setId(UUID.randomUUID());
        revision.setRequest(r);
        revision.setRevisionNo((short) no);
        revision.setPayload("{}");
        revision.setSubmittedAt(Instant.parse("2026-09-20T02:00:00Z"));
        revision.setNote(note);
        return revision;
    }

    static AuditLog auditAt(Instant at) {
        AuditLog log = new AuditLog();
        log.setOccurredAt(at);
        return log;
    }

    TransportRequest submitted() {
        TransportRequest r = draft(shadowfax);
        r.setStatus(RequestStatus.SUBMITTED);
        r.setCode("REQ-2026-0001");
        r.setSubmittedAt(Instant.parse("2026-10-17T02:00:00Z"));
        return r;
    }

    static RouteResponse route(int leadTimeDays) {
        return RouteResponse.builder()
                .code("RD HCM → BKK")
                .mode(TransportMode.ROAD)
                .fromCity("Ho Chi Minh City")
                .toCity("Bangkok")
                .crossBorder(true)
                .leadTimeDays(leadTimeDays)
                .earliestDeparture(LocalDate.of(2026, 9, 26).plusDays(leadTimeDays))
                .build();
    }

    static TransportRequestRepository.HorseCount count(UUID requestId, long horses) {
        return new TransportRequestRepository.HorseCount() {
            public UUID getRequestId() {
                return requestId;
            }

            public long getHorses() {
                return horses;
            }
        };
    }

    static Horse horse(String name, HorseSex sex, String value) {
        HorseSizeClass m = new HorseSizeClass();
        m.setCode("M");
        Horse h = new Horse();
        h.setId(UUID.randomUUID());
        h.setName(name);
        h.setSex(sex);
        h.setDeclaredValue(new BigDecimal(value));
        h.setSizeClass(m);
        h.setRequiredStall(name.equals("Nightfall") ? StallType.CLIMATE : StallType.STANDARD);
        h.setPassportNo("VN-PP-2019-0412");
        h.setMicrochip("250259600123456");
        h.setDateOfBirth(LocalDate.of(2019, 5, 10));
        h.setHeightHh(new BigDecimal("16.2"));
        h.setWeightKg((short) 510);
        return h;
    }

    static Place place(String name, String city) {
        Country vn = new Country();
        vn.setCode("VN");
        vn.setName("Vietnam");
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setName(name);
        p.setKind(PlaceKind.STABLE);
        p.setCity(city);
        p.setCountry(vn);
        return p;
    }

    // --- the instant estimate (US-Q-05) ------------------------------------------------------------------

    RequestDraftRequest routed(Horse... list) {
        return body(list).toBuilder()
                .originPlaceId(phuTho.getId())
                .destinationPlaceId(chaoPhraya.getId())
                .build();
    }

    @Test
    void anEstimateNeedsHorsesAndARoute() {
        com.equifreight.model.estimate.EstimateResponse noHorses = service.estimate(user, routed());
        assertThat(noHorses.status()).isEqualTo(com.equifreight.service.pricing.EstimateStatus.NOT_READY);
        assertThat(noHorses.message()).isEqualTo("Choose the route and horses to see an estimate.");
        assertThat(noHorses.options().mode()).isEmpty();

        RequestDraftRequest noDestination =
                routed(shadowfax).toBuilder().destinationPlaceId(null).build();
        assertThat(service.estimate(user, noDestination).status())
                .isEqualTo(com.equifreight.service.pricing.EstimateStatus.NOT_READY);
        verifyNoInteractions(estimator);
    }

    @Test
    void anEstimateOnARouteWeDontRun() {
        com.equifreight.model.estimate.EstimateResponse response = service.estimate(user, routed(shadowfax));

        assertThat(response.status()).isEqualTo(com.equifreight.service.pricing.EstimateStatus.NOT_RUN);
        assertThat(response.message()).isEqualTo("We don't run this route yet, so there's no estimate.");
        verifyNoInteractions(estimator);
    }

    @Test
    void anEstimateRefusesAnotherClubsHorse() {
        RequestDraftRequest body = routed().toBuilder()
                .horses(List.of(input(UUID.randomUUID(), false)))
                .build();

        assertThatThrownBy(() -> service.estimate(user, body)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aBodyTheSaveWouldRefuseIsUnavailableWithItsReason() {
        RequestDraftRequest flexible = window("08:00", "12:00").toBuilder()
                .horses(List.of(input(shadowfax.getId(), false)))
                .originPlaceId(phuTho.getId())
                .destinationPlaceId(chaoPhraya.getId())
                .dateFlexDays(3)
                .build();

        com.equifreight.model.estimate.EstimateResponse response = service.estimate(user, flexible);

        assertThat(response.status()).isEqualTo(com.equifreight.service.pricing.EstimateStatus.UNAVAILABLE);
        assertThat(response.message())
                .isEqualTo("An arrival window needs a road move with a private trailer and fixed dates. Choose road "
                        + "and a private trailer, and untick ±3 days, or arrive any time on the day.");
    }

    @Test
    void anEstimateSavesNothing() {
        com.equifreight.entity.Corridor corridor = new com.equifreight.entity.Corridor();
        corridor.setId(UUID.randomUUID());
        corridor.setMode(TransportMode.ROAD);
        when(routes.resolve(any(), any(), any(), any(), any()))
                .thenReturn(
                        new RouteResolution(corridor, null, java.util.Set.of(TransportMode.ROAD), null, false, false));
        when(estimator.estimate(any(), any()))
                .thenReturn(new RequestEstimator.View(
                        com.equifreight.service.pricing.EstimateResult.range(
                                new java.math.BigDecimal("31900"), new java.math.BigDecimal("43300")),
                        List.of("Assumes a shared load until you choose a trailer on step 3."),
                        5,
                        java.util.Map.of(
                                "mode",
                                List.of(new RequestEstimator.Option("ROAD", true, null, null, null, null)),
                                "trailer",
                                List.of(new RequestEstimator.Option(
                                        "PRIVATE",
                                        false,
                                        new java.math.BigDecimal("400"),
                                        new java.math.BigDecimal("600"),
                                        null,
                                        null)))));

        com.equifreight.model.estimate.EstimateResponse response = service.estimate(user, routed(shadowfax));

        verify(requests, never()).save(any());
        verify(requests, never()).saveAndFlush(any());
        verify(requests, never()).delete(any());
        verifyNoInteractions(audit);
        assertThat(response.status()).isEqualTo(com.equifreight.service.pricing.EstimateStatus.READY);
        assertThat(response.low()).isEqualByComparingTo("31900");
        assertThat(response.high()).isEqualByComparingTo("43300");
        assertThat(response.assumptions())
                .containsExactly("Assumes a shared load until you choose a trailer on step 3.");
        assertThat(response.versionNo()).isEqualTo(5);
        assertThat(response.options().mode())
                .singleElement()
                .satisfies(o -> assertThat(o.current()).isTrue());
        assertThat(response.options().trailer())
                .singleElement()
                .satisfies(o -> assertThat(o.deltaHigh()).isEqualByComparingTo("600"));
        assertThat(response.options().airClass()).isEmpty();
        assertThat(response.options().arrivalWindow()).isEmpty();
    }
}
