package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.RegulationCatalog;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.route.CrossingResponse;
import com.equifreight.model.route.RouteResponse;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RegulationCatalogRepository;
import com.equifreight.repository.RegulationVersionRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Spec R-05 (corridor resolution) and R-06 (lead time from the published regulation versions). */
class RouteServiceTest {

    private static final Map<String, Country> COUNTRIES = Map.of(
            "VN",
            country("VN", "Vietnam"),
            "KH",
            country("KH", "Cambodia"),
            "TH",
            country("TH", "Thailand"),
            "LA",
            country("LA", "Laos"),
            "MY",
            country("MY", "Malaysia"),
            "HK",
            country("HK", "Hong Kong"));

    private final Place phuTho = place("Phú Thọ training centre", "Ho Chi Minh City", "VN");
    private final Place socSon = place("Sóc Sơn quarantine station", "Hanoi", "VN");
    private final Place chaoPhraya = place("Chao Phraya Racing Stables", "Bangkok", "TH");
    private final Place vientiane = place("Vientiane racing stables", "Vientiane", "LA");
    private final Place phnomPenh = place("Phnom Penh Equestrian Centre", "Phnom Penh", "KH");

    private final BorderCrossing mocBai = crossing("Mộc Bài – Bavet", "VN", "KH");
    private final BorderCrossing poipet = crossing("Poipet – Aranyaprathet", "KH", "TH");
    private final BorderCrossing cauTreo = crossing("Cầu Treo – Nam Phao", "VN", "LA");

    private CorridorRepository corridors;
    private PlaceRepository places;
    private RegulationCatalogRepository catalogs;
    private RegulationVersionRepository versions;
    private RouteService service;

    @BeforeEach
    void setUp() {
        corridors = mock(CorridorRepository.class);
        places = mock(PlaceRepository.class);
        catalogs = mock(RegulationCatalogRepository.class);
        versions = mock(RegulationVersionRepository.class);
        service = new RouteService(
                corridors,
                places,
                org.mockito.Mockito.mock(com.equifreight.repository.BorderCrossingRepository.class),
                catalogs,
                versions,
                Clock.fixed(Instant.parse("2026-09-26T03:00:00Z"), BusinessTime.ZONE));
        publish("VN", 21);
        publish("KH", 21);
        publish("TH", 21);
        publish("LA", 30);
    }

    @Test
    void aForwardCorridorResolvesWithItsCrossingsInOrder() {
        Corridor hcmBkk = corridor("RD HCM → BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", mocBai, poipet);
        when(corridors.findBetweenCities("Ho Chi Minh City", "Bangkok")).thenReturn(List.of(hcmBkk));

        RouteResolution resolution = service.resolve(phuTho, null, chaoPhraya, null, null);

        assertThat(resolution.corridor()).isSameAs(hcmBkk);
        RouteResponse route = resolution.route();
        assertThat(route.code()).isEqualTo("RD HCM → BKK");
        assertThat(route.fromCity()).isEqualTo("Ho Chi Minh City");
        assertThat(route.toCity()).isEqualTo("Bangkok");
        assertThat(route.crossings())
                .extracting(CrossingResponse::name, CrossingResponse::fromCountry, CrossingResponse::toCountry)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Mộc Bài – Bavet", "VN", "KH"),
                        org.assertj.core.groups.Tuple.tuple("Poipet – Aranyaprathet", "KH", "TH"));
        assertThat(route.countries()).containsExactly("VN", "KH", "TH");
        assertThat(route.countryNames()).containsExactly("Vietnam", "Cambodia", "Thailand");
        assertThat(route.crossBorder()).isTrue();
        assertThat(route.leadTimeDays()).isEqualTo(21);
        assertThat(route.earliestDeparture()).isEqualTo(LocalDate.of(2026, 10, 17));
    }

    @Test
    void aReversedCorridorReadsInTheDirectionOfTravel() {
        Corridor hcmBkk = corridor("RD HCM → BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", mocBai, poipet);
        when(corridors.findBetweenCities("Bangkok", "Ho Chi Minh City")).thenReturn(List.of(hcmBkk));

        RouteResponse route = service.resolve(chaoPhraya, null, phuTho, null, TransportMode.ROAD)
                .route();

        assertThat(route.fromCity()).isEqualTo("Bangkok");
        assertThat(route.toCity()).isEqualTo("Ho Chi Minh City");
        assertThat(route.crossings())
                .extracting(CrossingResponse::name, CrossingResponse::fromCountry, CrossingResponse::toCountry)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Poipet – Aranyaprathet", "TH", "KH"),
                        org.assertj.core.groups.Tuple.tuple("Mộc Bài – Bavet", "KH", "VN"));
        assertThat(route.countries()).containsExactly("TH", "KH", "VN");
    }

    @Test
    void directionIsDecidedIgnoringCase() {
        Place lowerCase = place("Phú Thọ training centre", "ho chi minh city", "VN");
        Corridor hcmBkk = corridor("RD HCM → BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", mocBai, poipet);
        when(corridors.findBetweenCities("ho chi minh city", "Bangkok")).thenReturn(List.of(hcmBkk));

        RouteResponse route =
                service.resolve(lowerCase, null, chaoPhraya, null, null).route();

        assertThat(route.crossings().getFirst().name()).isEqualTo("Mộc Bài – Bavet");
        assertThat(route.fromCity()).isEqualTo("Ho Chi Minh City");
    }

    @Test
    void aForwardMatchWinsOverAReversedOne() {
        Corridor forward = corridor("RD HCM → PNH", TransportMode.ROAD, "Ho Chi Minh City", "Phnom Penh", mocBai);
        Corridor reverse = corridor("RD PNH → HCM", TransportMode.ROAD, "Phnom Penh", "Ho Chi Minh City", mocBai);
        when(corridors.findBetweenCities("Ho Chi Minh City", "Phnom Penh")).thenReturn(List.of(reverse, forward));

        assertThat(service.resolve(phuTho, null, phnomPenh, null, TransportMode.ROAD)
                        .corridor())
                .isSameAs(forward);
    }

    @Test
    void theModeChoosesTheCorridor() {
        Corridor road = corridor("RD PNH → BKK", TransportMode.ROAD, "Phnom Penh", "Bangkok", poipet);
        Corridor air = corridor("AIR PNH → BKK", TransportMode.AIR, "Phnom Penh", "Bangkok");
        when(corridors.findBetweenCities("Phnom Penh", "Bangkok")).thenReturn(List.of(air, road));

        assertThat(service.resolve(phnomPenh, null, chaoPhraya, null, TransportMode.AIR)
                        .corridor())
                .isSameAs(air);
        RouteResolution noMode = service.resolve(phnomPenh, null, chaoPhraya, null, null);
        assertThat(noMode.corridor()).isNull();
        assertThat(noMode.route()).isNull();
        assertThat(noMode.modesRun()).containsExactlyInAnyOrder(TransportMode.ROAD, TransportMode.AIR);
    }

    @Test
    void aModeWeDontRunLeavesNoCorridorButKnowsTheOtherMode() {
        Corridor hcmBkk = corridor("RD HCM → BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", mocBai, poipet);
        when(corridors.findBetweenCities("Ho Chi Minh City", "Bangkok")).thenReturn(List.of(hcmBkk));

        RouteResolution resolution = service.resolve(phuTho, null, chaoPhraya, null, TransportMode.AIR);

        assertThat(resolution.corridor()).isNull();
        assertThat(resolution.modesRun()).containsExactly(TransportMode.ROAD);
    }

    @Test
    void aTypedCityNeverResolves() {
        when(places.existsByCityIgnoreCaseAndKindNot("Bangkok", PlaceKind.WELFARE_STOP))
                .thenReturn(true);
        when(places.existsByCityIgnoreCaseAndKindNot("Singapore", PlaceKind.WELFARE_STOP))
                .thenReturn(false);

        RouteResolution resolution = service.resolve(null, "Bangkok", null, "Singapore", TransportMode.ROAD);

        assertThat(resolution.corridor()).isNull();
        assertThat(resolution.modesRun()).isEmpty();
        assertThat(resolution.originTypedCityServed()).isTrue();
        assertThat(resolution.destinationTypedCityServed()).isFalse();
        verifyNoInteractions(corridors);
    }

    @Test
    void aDomesticRouteUsesTheDomesticLeadTime() {
        Corridor hcmHan = corridor("RD HCM → HAN", TransportMode.ROAD, "Ho Chi Minh City", "Hanoi");
        when(corridors.findBetweenCities("Ho Chi Minh City", "Hanoi")).thenReturn(List.of(hcmHan));

        RouteResponse route = service.resolve(phuTho, null, socSon, null, null).route();

        assertThat(route.countries()).containsExactly("VN");
        assertThat(route.crossBorder()).isFalse();
        assertThat(route.leadTimeDays()).isEqualTo(3);
        assertThat(route.earliestDeparture()).isEqualTo(LocalDate.of(2026, 9, 29));
    }

    @Test
    void laosRaisesTheLeadTimeTo30() {
        Corridor hanVte = corridor("RD HAN → VTE", TransportMode.ROAD, "Hanoi", "Vientiane", cauTreo);
        when(corridors.findBetweenCities("Hanoi", "Vientiane")).thenReturn(List.of(hanVte));

        RouteResponse route =
                service.resolve(socSon, null, vientiane, null, null).route();

        assertThat(route.leadTimeDays()).isEqualTo(30);
        assertThat(route.earliestDeparture()).isEqualTo(LocalDate.of(2026, 10, 26));
    }

    @Test
    void aCountryWithoutAPublishedVersionLeavesTheLeadTimeUnknown() {
        RegulationCatalog laos = catalogOf("LA");
        when(versions.findByCatalogIdAndStatusOrdered(laos.getId(), CatalogStatus.PUBLISHED))
                .thenReturn(List.of());
        Corridor hanVte = corridor("RD HAN → VTE", TransportMode.ROAD, "Hanoi", "Vientiane", cauTreo);
        when(corridors.findBetweenCities("Hanoi", "Vientiane")).thenReturn(List.of(hanVte));

        RouteResolution resolution = service.resolve(socSon, null, vientiane, null, null);

        assertThat(resolution.route().leadTimeDays()).isNull();
        assertThat(resolution.route().earliestDeparture()).isNull();
        assertThat(resolution.catalogMissingFor()).isEqualTo("Laos");
    }

    @Test
    void aCountryWithNoCatalogLeavesTheLeadTimeUnknown() {
        when(catalogs.findByCountryCode("LA")).thenReturn(Optional.empty());
        Corridor hanVte = corridor("RD HAN → VTE", TransportMode.ROAD, "Hanoi", "Vientiane", cauTreo);
        when(corridors.findBetweenCities("Hanoi", "Vientiane")).thenReturn(List.of(hanVte));

        assertThat(service.resolve(socSon, null, vientiane, null, null).catalogMissingFor())
                .isEqualTo("Laos");
    }

    @Test
    void theNewestPublishedVersionCounts() {
        RegulationCatalog laos = catalogOf("LA");
        when(versions.findByCatalogIdAndStatusOrdered(laos.getId(), CatalogStatus.PUBLISHED))
                .thenReturn(List.of(version(30), version(21)));
        Corridor hanVte = corridor("RD HAN → VTE", TransportMode.ROAD, "Hanoi", "Vientiane", cauTreo);
        when(corridors.findBetweenCities("Hanoi", "Vientiane")).thenReturn(List.of(hanVte));

        assertThat(service.resolve(socSon, null, vientiane, null, null).route().leadTimeDays())
                .isEqualTo(30);
    }

    @Test
    void routesWithoutADestinationListTheOriginCitysCorridors() {
        UUID id = UUID.randomUUID();
        when(places.findById(id)).thenReturn(Optional.of(chaoPhraya));
        when(corridors.findTouchingCity("Bangkok"))
                .thenReturn(List.of(
                        corridor(
                                "RD BKK → KUL",
                                TransportMode.ROAD,
                                "Bangkok",
                                "Kuala Lumpur",
                                crossing("Sadao – Bukit Kayu Hitam", "TH", "MY")),
                        corridor(
                                "RD BKK → VTE",
                                TransportMode.ROAD,
                                "Bangkok",
                                "Vientiane",
                                crossing("Nong Khai – Vientiane", "TH", "LA")),
                        corridor("RD PNH → BKK", TransportMode.ROAD, "Phnom Penh", "Bangkok", poipet)));

        List<RouteResponse> routes = service.routes(id, null);

        assertThat(routes).extracting(RouteResponse::fromCity).containsOnly("Bangkok");
        assertThat(routes).extracting(RouteResponse::toCity).containsExactly("Kuala Lumpur", "Vientiane", "Phnom Penh");
        assertThat(routes.get(2).crossings().getFirst().fromCountry()).isEqualTo("TH");
        assertThat(routes).allSatisfy(r -> {
            assertThat(r.countries()).isNull();
            assertThat(r.crossBorder()).isNull();
            assertThat(r.leadTimeDays()).isNull();
            assertThat(r.earliestDeparture()).isNull();
        });
    }

    @Test
    void routesBetweenTwoPlacesDescribeEachCorridor() {
        UUID from = UUID.randomUUID();
        UUID to = UUID.randomUUID();
        when(places.findById(from)).thenReturn(Optional.of(phuTho));
        when(places.findById(to)).thenReturn(Optional.of(chaoPhraya));
        when(corridors.findBetweenCities("Ho Chi Minh City", "Bangkok"))
                .thenReturn(List.of(
                        corridor("RD HCM → BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", mocBai, poipet)));

        List<RouteResponse> routes = service.routes(from, to);

        assertThat(routes)
                .singleElement()
                .satisfies(r -> assertThat(r.leadTimeDays()).isEqualTo(21));
    }

    @Test
    void anUnknownPlaceAnswers404() {
        UUID unknown = UUID.randomUUID();
        when(places.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.routes(unknown, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Place not found: " + unknown);
    }

    private void publish(String countryCode, int leadTimeDays) {
        RegulationCatalog catalog = catalogOf(countryCode);
        when(versions.findByCatalogIdAndStatusOrdered(catalog.getId(), CatalogStatus.PUBLISHED))
                .thenReturn(List.of(version(leadTimeDays)));
    }

    private RegulationCatalog catalogOf(String countryCode) {
        RegulationCatalog catalog = new RegulationCatalog();
        catalog.setId(UUID.nameUUIDFromBytes(countryCode.getBytes()));
        catalog.setCountry(COUNTRIES.get(countryCode));
        catalog.setName(COUNTRIES.get(countryCode).getName() + " import");
        when(catalogs.findByCountryCode(countryCode)).thenReturn(Optional.of(catalog));
        return catalog;
    }

    private static RegulationVersion version(int leadTimeDays) {
        RegulationVersion v = new RegulationVersion();
        v.setStatus(CatalogStatus.PUBLISHED);
        v.setLeadTimeDays((short) leadTimeDays);
        v.setDomesticLeadTimeDays((short) 3);
        return v;
    }

    private static Country country(String code, String name) {
        Country c = new Country();
        c.setId(UUID.nameUUIDFromBytes(code.getBytes()));
        c.setCode(code);
        c.setName(name);
        return c;
    }

    private static Place place(String name, String city, String countryCode) {
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setName(name);
        p.setKind(PlaceKind.STABLE);
        p.setCity(city);
        p.setCountry(COUNTRIES.get(countryCode));
        return p;
    }

    private static BorderCrossing crossing(String name, String from, String to) {
        BorderCrossing b = new BorderCrossing();
        b.setName(name);
        b.setFromCountry(COUNTRIES.get(from));
        b.setToCountry(COUNTRIES.get(to));
        return b;
    }

    private static Corridor corridor(
            String code, TransportMode mode, String from, String to, BorderCrossing... crossings) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(mode);
        c.setOriginCity(from);
        c.setDestinationCity(to);
        c.setDistanceKm(500);
        for (int i = 0; i < crossings.length; i++) {
            CorridorCrossing cc = new CorridorCrossing();
            cc.setCorridor(c);
            cc.setSeq((short) (i + 1));
            cc.setCorridor(c);
            cc.setBorderCrossing(crossings[i]);
            c.getCrossings().add(cc);
        }
        return c;
    }
    // ---------- routes by way of hubs (US-F1-09) ----------

    private final Place hoaXuan = place("Hòa Xuân racing stables", "Da Nang", "VN");
    private final Place shaTin = place("Sha Tin stables", "Hong Kong", "HK");

    private static Corridor between(
            String code, TransportMode mode, String from, String to, String a, String b, int km) {
        Corridor c = corridor(code, mode, from, to);
        c.setOriginCountry(COUNTRIES.get(a));
        c.setDestinationCountry(COUNTRIES.get(b));
        c.setDistanceKm(km);
        return c;
    }

    private final Corridor dadHcm =
            between("RD DAD → HCM", TransportMode.ROAD, "Da Nang", "Ho Chi Minh City", "VN", "VN", 960);
    private final Corridor hcmHan =
            between("RD HCM → HAN", TransportMode.ROAD, "Ho Chi Minh City", "Hanoi", "VN", "VN", 1700);
    private final Corridor sgnHkg =
            between("AIR SGN → HKG", TransportMode.AIR, "Ho Chi Minh City", "Hong Kong", "VN", "HK", 1500);

    @Test
    @DisplayName("Da Nang → Hong Kong goes by road to Ho Chi Minh City, then flies: one route naming its first leg")
    void aCityWithNoCorridorAbroadGoesByWayOfTheHub() {
        publish("HK", 21);
        when(corridors.findNetwork()).thenReturn(List.of(dadHcm, hcmHan, sgnHkg));

        RouteResolution resolution = service.resolve(hoaXuan, null, shaTin, null, null);

        assertThat(resolution.corridor()).isSameAs(sgnHkg);
        assertThat(resolution.firstLeg()).isSameAs(dadHcm);
        assertThat(resolution.lastLeg()).isNull();
        assertThat(resolution.modesRun()).containsExactly(TransportMode.AIR);
        RouteResponse route = resolution.route();
        assertThat(route.fromCity()).isEqualTo("Ho Chi Minh City");
        assertThat(route.firstLeg().fromCity()).isEqualTo("Da Nang");
        assertThat(route.firstLeg().toCity()).isEqualTo("Ho Chi Minh City");
        assertThat(route.firstLeg().distanceKm()).isEqualTo(960);
        assertThat(route.crossBorder()).isTrue();
        assertThat(route.countries()).containsExactly("VN", "HK");
    }

    @Test
    @DisplayName("Da Nang → Sha Tin: the road to Ho Chi Minh City, the flight, then the road from HKG to the stables")
    void bothLegsWhenTheStablesAreBeyondTheAirport() {
        publish("HK", 21);
        Corridor hkgShaTin = between("RD HKG → Sha Tin", TransportMode.ROAD, "Hong Kong", "Sha Tin", "HK", "HK", 40);
        when(corridors.findNetwork()).thenReturn(List.of(dadHcm, sgnHkg, hkgShaTin));

        RouteResolution resolution =
                service.resolve(hoaXuan, null, place("Sha Tin stables", "Sha Tin", "HK"), null, null);

        assertThat(resolution.firstLeg()).isSameAs(dadHcm);
        assertThat(resolution.corridor()).isSameAs(sgnHkg);
        assertThat(resolution.lastLeg()).isSameAs(hkgShaTin);
        assertThat(resolution.route().lastLeg().fromCity()).isEqualTo("Hong Kong");
        assertThat(resolution.route().lastLeg().toCity()).isEqualTo("Sha Tin");
    }

    @Test
    @DisplayName("A flight from a stable to a stable names the local runs to and from the cargo terminals (US-F3-22)")
    void aFlightNamesItsLocalRuns() {
        publish("HK", 21);
        publish("VN", 21);
        Corridor hcmLocal =
                between("RD HCM local", TransportMode.ROAD, "Ho Chi Minh City", "Ho Chi Minh City", "VN", "VN", 40);
        Corridor hkgLocal = between("RD HKG local", TransportMode.ROAD, "Hong Kong", "Hong Kong", "HK", "HK", 35);
        Place tcs = place("TCS cargo terminal", "Ho Chi Minh City", "VN");
        tcs.setKind(PlaceKind.CARGO_TERMINAL);
        Place hkgAirport = place("Hong Kong International Airport", "Hong Kong", "HK");
        hkgAirport.setKind(PlaceKind.AIRPORT);
        when(corridors.findBetweenCities("Ho Chi Minh City", "Hong Kong")).thenReturn(List.of(sgnHkg));
        when(corridors.findNetwork()).thenReturn(List.of(sgnHkg, hcmLocal, hkgLocal));
        when(corridors.findLocalRun("Ho Chi Minh City")).thenReturn(Optional.of(hcmLocal));
        when(corridors.findLocalRun("Hong Kong")).thenReturn(Optional.of(hkgLocal));
        when(places.findByCityIgnoreCase("Ho Chi Minh City")).thenReturn(List.of(phuTho, tcs));
        when(places.findByCityIgnoreCase("Hong Kong")).thenReturn(List.of(shaTin, hkgAirport));

        RouteResponse route =
                service.resolve(phuTho, null, shaTin, null, TransportMode.AIR).route();

        assertThat(route.toTerminal().fromPlace()).isEqualTo("Phú Thọ training centre");
        assertThat(route.toTerminal().toPlace()).isEqualTo("TCS cargo terminal");
        assertThat(route.toTerminal().distanceKm()).isEqualTo(40);
        assertThat(route.fromTerminal().fromPlace()).isEqualTo("Hong Kong International Airport");
        assertThat(route.fromTerminal().toPlace()).isEqualTo("Sha Tin stables");

        // Picked up at the terminal itself, there is no run to it.
        RouteResponse fromTerminal =
                service.resolve(tcs, null, shaTin, null, TransportMode.AIR).route();
        assertThat(fromTerminal.toTerminal()).isNull();
        assertThat(fromTerminal.fromTerminal()).isNotNull();
    }

    @Test
    @DisplayName("Hong Kong → Da Nang reads the same corridors the other way: the flight, then the road from the hub")
    void theLegFromTheHubIsReadTheOtherWay() {
        publish("HK", 21);
        when(corridors.findNetwork()).thenReturn(List.of(dadHcm, sgnHkg));

        RouteResolution resolution = service.resolve(shaTin, null, hoaXuan, null, TransportMode.AIR);

        assertThat(resolution.corridor()).isSameAs(sgnHkg);
        assertThat(resolution.firstLeg()).isNull();
        assertThat(resolution.lastLeg()).isSameAs(dadHcm);
        assertThat(resolution.route().fromCity()).isEqualTo("Hong Kong");
        assertThat(resolution.route().lastLeg().fromCity()).isEqualTo("Ho Chi Minh City");
        assertThat(resolution.route().lastLeg().toCity()).isEqualTo("Da Nang");
    }

    @Test
    @DisplayName(
            "Two domestic corridors are never chained: Da Nang → Hanoi through Ho Chi Minh City is a route we don't run")
    void domesticCorridorsAreNeverChained() {
        when(corridors.findNetwork()).thenReturn(List.of(dadHcm, hcmHan, sgnHkg));

        RouteResolution resolution = service.resolve(hoaXuan, null, socSon, null, null);

        assertThat(resolution.corridor()).isNull();
        assertThat(resolution.modesRun()).isEmpty();
    }

    @Test
    @DisplayName("A corridor between the two cities wins over a route by way of a hub")
    void aDirectCorridorWins() {
        when(corridors.findBetweenCities("Ho Chi Minh City", "Hanoi")).thenReturn(List.of(hcmHan));

        RouteResolution resolution = service.resolve(phuTho, null, socSon, null, null);

        assertThat(resolution.corridor()).isSameAs(hcmHan);
        assertThat(resolution.firstLeg()).isNull();
        assertThat(resolution.route().firstLeg()).isNull();
        assertThat(resolution.modesRun()).containsExactly(TransportMode.ROAD);
    }
}
