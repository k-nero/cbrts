package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.Horse;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.Place;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.RequestRevision;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.request.RequestDraftRequest;
import com.equifreight.model.request.RequestHorseInput;
import com.equifreight.model.request.RequestHorseResponse;
import com.equifreight.model.request.RequestResponse;
import com.equifreight.model.request.RequestSummaryResponse;
import com.equifreight.model.route.RouteResponse;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RequestRevisionRepository;
import com.equifreight.repository.TransportRequestRepository;
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
        service = new RequestService(
                requests,
                horses,
                places,
                revisions,
                routes,
                clubs,
                codes,
                audit,
                JsonMapper.builder().build(),
                Clock.fixed(NOW, BusinessTime.ZONE));

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
        assertThat(response.getHorses())
                .extracting(RequestHorseResponse::getName)
                .containsExactly("Nightfall", "Shadowfax");
        assertThat(response.getStatus()).isEqualTo(RequestStatus.DRAFT);
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

        assertThat(response.getCreatedAt()).isEqualTo(written);
        assertThat(response.getUpdatedAt()).isEqualTo(written);
    }

    @Test
    void anotherClubsHorseAnswers404() {
        UUID stranger = UUID.randomUUID();
        RequestDraftRequest body = new RequestDraftRequest();
        body.setHorses(List.of(input(stranger, false)));

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

        assertThat(response.getHorses())
                .singleElement()
                .satisfies(h -> assertThat(h.isArchived()).isTrue());
        verify(requests).saveAndFlush(draft);
    }

    @Test
    void aFoalIsOnlyForAMare() {
        RequestDraftRequest gelding = new RequestDraftRequest();
        gelding.setHorses(List.of(input(shadowfax.getId(), true)));
        assertThatThrownBy(() -> service.create(user, gelding))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only a mare can travel with a foal at foot; Shadowfax is a gelding.")
                .extracting("code")
                .isEqualTo("FOAL_NOT_A_MARE");

        RequestDraftRequest mare = new RequestDraftRequest();
        mare.setHorses(List.of(input(nightfall.getId(), true)));
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
        assertThat(response.getHorses())
                .extracting(RequestHorseResponse::getName)
                .containsExactly("Copper King", "Nightfall");
    }

    @Test
    void anEndIsAPlaceOrATextNotBoth() {
        RequestDraftRequest origin = body();
        origin.setOriginPlaceId(phuTho.getId());
        origin.setOriginText("Ho Chi Minh City");
        assertRefused(origin, "PLACE_OR_TEXT", "Choose a place or type a city for the origin, not both.");

        RequestDraftRequest destination = body();
        destination.setDestinationPlaceId(chaoPhraya.getId());
        destination.setDestinationText("Bangkok");
        assertRefused(destination, "PLACE_OR_TEXT", "Choose a place or type a city for the destination, not both.");
    }

    @Test
    void anUnknownPlaceAnswers404() {
        UUID unknown = UUID.randomUUID();
        RequestDraftRequest body = body();
        body.setDestinationPlaceId(unknown);

        assertThatThrownBy(() -> service.create(user, body))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Place not found: " + unknown);
    }

    @Test
    void theSamePlaceTwiceIsRefused() {
        RequestDraftRequest body = body();
        body.setOriginPlaceId(phuTho.getId());
        body.setDestinationPlaceId(phuTho.getId());

        assertRefused(body, "SAME_PLACE", "The horses can't be collected and delivered at the same place.");
    }

    @Test
    void textsAreTrimmedAndBlankIsNull() {
        RequestDraftRequest body = body();
        body.setOriginText(" Singapore ");
        body.setDestinationText("  ");
        body.setSpecialInstructions("  Quiet loading. ");

        service.create(user, body);

        TransportRequest saved = savedRequest();
        assertThat(saved.getOriginText()).isEqualTo("Singapore");
        assertThat(saved.getDestinationText()).isNull();
        assertThat(saved.getSpecialInstructions()).isEqualTo("Quiet loading.");
    }

    @Test
    void roadWithAnAirClassOrAirWithATrailerIsRefused() {
        RequestDraftRequest road = body();
        road.setMode(TransportMode.ROAD);
        road.setAirClass(ServiceClass.BUSINESS);
        assertRefused(road, "MODE_OPTIONS", "Air moves have no trailer, and road moves have no air class.");

        RequestDraftRequest air = body();
        air.setMode(TransportMode.AIR);
        air.setTrailer(TrailerType.SHARED);
        assertRefused(air, "MODE_OPTIONS", "Air moves have no trailer, and road moves have no air class.");
    }

    @Test
    void aTrailerAndAnAirClassWithoutAModeAreRefused() {
        RequestDraftRequest body = body();
        body.setTrailer(TrailerType.SHARED);
        body.setAirClass(ServiceClass.BUSINESS);

        assertRefused(body, "MODE_OPTIONS", "Air moves have no trailer, and road moves have no air class.");
    }

    @Test
    void aWelfareStopIsNotAnEnd() {
        Place welfare = place("Svay Rieng welfare stop", "Svay Rieng");
        welfare.setKind(PlaceKind.WELFARE_STOP);
        when(places.findById(welfare.getId())).thenReturn(Optional.of(welfare));
        RequestDraftRequest body = body();
        body.setOriginPlaceId(welfare.getId());

        assertRefused(
                body,
                "PLACE_NOT_AN_END",
                "Svay Rieng welfare stop is a stop on the way, not a pickup or delivery point.");
    }

    @Test
    void flexIsZeroOrThree() {
        RequestDraftRequest two = body();
        two.setDateFlexDays(2);
        assertRefused(two, "DATE_FLEX", "Dates can move by 0 or 3 days; 2 was given.");

        service.create(user, body());
        assertThat(savedRequest().getDateFlexDays()).isZero();
    }

    @Test
    void aWindowNeedsRoadAPrivateTrailerAndFixedDates() {
        String message = "An arrival window needs a road move with a private trailer and fixed dates. Choose road "
                + "and a private trailer, and untick ±3 days, or arrive any time on the day.";
        RequestDraftRequest air = window("08:00", "12:00");
        air.setMode(TransportMode.AIR);
        air.setTrailer(null);
        assertRefused(air, "ARRIVAL_WINDOW", message);

        RequestDraftRequest shared = window("08:00", "12:00");
        shared.setTrailer(TrailerType.SHARED);
        assertRefused(shared, "ARRIVAL_WINDOW", message);

        RequestDraftRequest flexible = window("08:00", "12:00");
        flexible.setDateFlexDays(3);
        assertRefused(flexible, "ARRIVAL_WINDOW", message);
    }

    @Test
    void aWindowNeedsBothTimes() {
        RequestDraftRequest body = window("08:00", "12:00");
        body.setWindowEnd(null);

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
        RequestDraftRequest body = window("08:00", "12:00");
        body.setArrivalMode(ArrivalMode.ANY_TIME);

        assertRefused(body, "ARRIVAL_WINDOW", "Arrival any time on the day takes no window times.");
    }

    @Test
    void theCorridorIsResolvedOnSave() {
        Corridor hcmBkk = new Corridor();
        hcmBkk.setCode("RD HCM → BKK");
        when(routes.resolve(phuTho, null, chaoPhraya, null, TransportMode.ROAD))
                .thenReturn(new RouteResolution(hcmBkk, route(21), Set.of(TransportMode.ROAD), null, false, false));
        RequestDraftRequest body = body(shadowfax);
        body.setOriginPlaceId(phuTho.getId());
        body.setDestinationPlaceId(chaoPhraya.getId());
        body.setMode(TransportMode.ROAD);

        RequestResponse response = service.create(user, body);

        assertThat(savedRequest().getCorridor()).isSameAs(hcmBkk);
        assertThat(response.getRoute().getCode()).isEqualTo("RD HCM → BKK");
    }

    @Test
    void aDraftCarriesItsLeadTime() {
        when(routes.resolve(any(), any(), any(), any(), any()))
                .thenReturn(
                        new RouteResolution(new Corridor(), route(21), Set.of(TransportMode.ROAD), null, false, false));
        RequestDraftRequest body = body(shadowfax);
        body.setDepartureDate(LocalDate.of(2026, 10, 30));

        RequestResponse response = service.create(user, body);

        assertThat(response.getLeadTime().getRequiredDays()).isEqualTo(21);
        assertThat(response.getLeadTime().getEarliestDeparture()).isEqualTo(LocalDate.of(2026, 10, 17));
        assertThat(response.getLeadTime().getDaysBeforeDeparture()).isEqualTo(34);
        assertThat(response.getLeadTime().isMet()).isTrue();
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

        assertThat(response.getBlockers()).isEmpty();
        assertThat(response.getLeadTime()).isNull();
        assertThat(response.getRoute().getCode()).isEqualTo("RD HCM → BKK");
        assertThat(response.getCode()).isEqualTo("REQ-2026-0001");
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
                .extracting(RequestSummaryResponse::getHorseCount)
                .containsExactly(2L, 1L);
        assertThat(service.list(user, RequestStatus.DRAFT, pageable).getContent())
                .extracting(RequestSummaryResponse::getId)
                .containsExactly(second.getId());
    }

    /** Spec R-07: submitting a draft. */
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
        }

        @Test
        void submitIssuesTheCodeAndSetsSubmitted() {
            RequestResponse response = service.submit(user, draft.getId());

            assertThat(response.getCode()).isEqualTo("REQ-2026-0193");
            assertThat(response.getStatus()).isEqualTo(RequestStatus.SUBMITTED);
            assertThat(response.getSubmittedAt()).isEqualTo(NOW);
            assertThat(response.getBlockers()).isEmpty();
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
                    JsonMapper.builder().build(),
                    Clock.fixed(Instant.parse("2026-12-31T17:30:00Z"), BusinessTime.ZONE));
            draft.setDepartureDate(LocalDate.of(2027, 2, 15));
            when(codes.next(CodePrefix.REQ, 2027)).thenReturn("REQ-2027-0001");

            assertThat(service.submit(user, draft.getId()).getCode()).isEqualTo("REQ-2027-0001");
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
        RequestDraftRequest body = new RequestDraftRequest();
        body.setHorses(new ArrayList<>(
                Arrays.stream(list).map(h -> input(h.getId(), false)).toList()));
        return body;
    }

    RequestDraftRequest window(String from, String until) {
        RequestDraftRequest body = body();
        body.setMode(TransportMode.ROAD);
        body.setTrailer(TrailerType.PRIVATE);
        body.setDateFlexDays(0);
        body.setArrivalMode(ArrivalMode.WINDOW);
        body.setWindowStart(OffsetDateTime.parse("2026-10-31T" + from + ":00+07:00"));
        body.setWindowEnd(OffsetDateTime.parse("2026-10-31T" + until + ":00+07:00"));
        return body;
    }

    static RequestHorseInput input(UUID horseId, boolean withFoal) {
        RequestHorseInput input = new RequestHorseInput();
        input.setHorseId(horseId);
        input.setWithFoal(withFoal);
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
}
