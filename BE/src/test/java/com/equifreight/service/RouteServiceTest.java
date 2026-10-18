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
            country("MY", "Malaysia"));

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
        assertThat(route.getCode()).isEqualTo("RD HCM → BKK");
        assertThat(route.getFromCity()).isEqualTo("Ho Chi Minh City");
        assertThat(route.getToCity()).isEqualTo("Bangkok");
        assertThat(route.getCrossings())
                .extracting(CrossingResponse::getName, CrossingResponse::getFromCountry, CrossingResponse::getToCountry)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Mộc Bài – Bavet", "VN", "KH"),
                        org.assertj.core.groups.Tuple.tuple("Poipet – Aranyaprathet", "KH", "TH"));
        assertThat(route.getCountries()).containsExactly("VN", "KH", "TH");
        assertThat(route.getCrossBorder()).isTrue();
        assertThat(route.getLeadTimeDays()).isEqualTo(21);
        assertThat(route.getEarliestDeparture()).isEqualTo(LocalDate.of(2026, 10, 17));
    }

    @Test
    void aReversedCorridorReadsInTheDirectionOfTravel() {
        Corridor hcmBkk = corridor("RD HCM → BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", mocBai, poipet);
        when(corridors.findBetweenCities("Bangkok", "Ho Chi Minh City")).thenReturn(List.of(hcmBkk));

        RouteResponse route = service.resolve(chaoPhraya, null, phuTho, null, TransportMode.ROAD)
                .route();

        assertThat(route.getFromCity()).isEqualTo("Bangkok");
        assertThat(route.getToCity()).isEqualTo("Ho Chi Minh City");
        assertThat(route.getCrossings())
                .extracting(CrossingResponse::getName, CrossingResponse::getFromCountry, CrossingResponse::getToCountry)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Poipet – Aranyaprathet", "TH", "KH"),
                        org.assertj.core.groups.Tuple.tuple("Mộc Bài – Bavet", "KH", "VN"));
        assertThat(route.getCountries()).containsExactly("TH", "KH", "VN");
    }

    @Test
    void directionIsDecidedIgnoringCase() {
        Place lowerCase = place("Phú Thọ training centre", "ho chi minh city", "VN");
        Corridor hcmBkk = corridor("RD HCM → BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", mocBai, poipet);
        when(corridors.findBetweenCities("ho chi minh city", "Bangkok")).thenReturn(List.of(hcmBkk));

        RouteResponse route =
                service.resolve(lowerCase, null, chaoPhraya, null, null).route();

        assertThat(route.getCrossings().getFirst().getName()).isEqualTo("Mộc Bài – Bavet");
        assertThat(route.getFromCity()).isEqualTo("Ho Chi Minh City");
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

        assertThat(route.getCountries()).containsExactly("VN");
        assertThat(route.getCrossBorder()).isFalse();
        assertThat(route.getLeadTimeDays()).isEqualTo(3);
        assertThat(route.getEarliestDeparture()).isEqualTo(LocalDate.of(2026, 9, 29));
    }

    @Test
    void laosRaisesTheLeadTimeTo30() {
        Corridor hanVte = corridor("RD HAN → VTE", TransportMode.ROAD, "Hanoi", "Vientiane", cauTreo);
        when(corridors.findBetweenCities("Hanoi", "Vientiane")).thenReturn(List.of(hanVte));

        RouteResponse route =
                service.resolve(socSon, null, vientiane, null, null).route();

        assertThat(route.getLeadTimeDays()).isEqualTo(30);
        assertThat(route.getEarliestDeparture()).isEqualTo(LocalDate.of(2026, 10, 26));
    }

    @Test
    void aCountryWithoutAPublishedVersionLeavesTheLeadTimeUnknown() {
        RegulationCatalog laos = catalogOf("LA");
        when(versions.findByCatalogIdAndStatusOrdered(laos.getId(), CatalogStatus.PUBLISHED))
                .thenReturn(List.of());
        Corridor hanVte = corridor("RD HAN → VTE", TransportMode.ROAD, "Hanoi", "Vientiane", cauTreo);
        when(corridors.findBetweenCities("Hanoi", "Vientiane")).thenReturn(List.of(hanVte));

        RouteResolution resolution = service.resolve(socSon, null, vientiane, null, null);

        assertThat(resolution.route().getLeadTimeDays()).isNull();
        assertThat(resolution.route().getEarliestDeparture()).isNull();
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

        assertThat(service.resolve(socSon, null, vientiane, null, null).route().getLeadTimeDays())
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

        assertThat(routes).extracting(RouteResponse::getFromCity).containsOnly("Bangkok");
        assertThat(routes)
                .extracting(RouteResponse::getToCity)
                .containsExactly("Kuala Lumpur", "Vientiane", "Phnom Penh");
        assertThat(routes.get(2).getCrossings().getFirst().getFromCountry()).isEqualTo("TH");
        assertThat(routes).allSatisfy(r -> {
            assertThat(r.getCountries()).isNull();
            assertThat(r.getCrossBorder()).isNull();
            assertThat(r.getLeadTimeDays()).isNull();
            assertThat(r.getEarliestDeparture()).isNull();
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
                .satisfies(r -> assertThat(r.getLeadTimeDays()).isEqualTo(21));
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
            cc.setId(new CorridorCrossing.Key(c.getId(), (short) (i + 1)));
            cc.setCorridor(c);
            cc.setBorderCrossing(crossings[i]);
            c.getCrossings().add(cc);
        }
        return c;
    }
}
