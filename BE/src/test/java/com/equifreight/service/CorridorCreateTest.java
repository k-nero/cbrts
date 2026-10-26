package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.route.CorridorResponse;
import com.equifreight.model.route.CreateCorridorRequest;
import com.equifreight.repository.BorderCrossingRepository;
import com.equifreight.repository.CorridorCrossingRepository;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.VehicleRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** The fleet & route coordinator adds a route we run, with the border crossings it takes. */
class CorridorCreateTest {

    private final CorridorRepository corridors = mock(CorridorRepository.class);
    private final PlaceRepository places = mock(PlaceRepository.class);
    private final BorderCrossingRepository crossings = mock(BorderCrossingRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final User khoi = new User();
    private final Country vn = country("VN", "Vietnam");
    private final Country kh = country("KH", "Cambodia");
    private final Country th = country("TH", "Thailand");
    private final BorderCrossing mocBai = crossing("Mộc Bài – Bavet", vn, kh);
    private final BorderCrossing poipet = crossing("Poipet – Aranyaprathet", kh, th);
    private CorridorService service;

    @BeforeEach
    void setUp() {
        service = new CorridorService(
                corridors,
                mock(CorridorCrossingRepository.class),
                places,
                crossings,
                audit,
                mock(VehicleRepository.class));
        when(places.findByCityIgnoreCase("Ho Chi Minh City")).thenReturn(List.of(place("Phú Thọ", vn)));
        when(places.findByCityIgnoreCase("Phnom Penh")).thenReturn(List.of(place("Phnom Penh stables", kh)));
        when(places.findByCityIgnoreCase("Bangkok")).thenReturn(List.of(place("Chao Phraya stables", th)));
        when(crossings.findByIdIn(anyCollection())).thenReturn(List.of(mocBai, poipet));
        when(corridors.saveAndFlush(any(Corridor.class))).thenAnswer(inv -> {
            Corridor c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
    }

    private static Country country(String code, String name) {
        Country c = new Country();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setName(name);
        return c;
    }

    private static BorderCrossing crossing(String name, Country from, Country to) {
        BorderCrossing b = new BorderCrossing();
        b.setId(UUID.randomUUID());
        b.setName(name);
        b.setFromCountry(from);
        b.setToCountry(to);
        return b;
    }

    private static Place place(String name, Country country) {
        Place p = new Place();
        p.setName(name);
        p.setKind(PlaceKind.STABLE);
        p.setCountry(country);
        return p;
    }

    private static CreateCorridorRequest road(String from, String to, List<UUID> crossingIds) {
        return CreateCorridorRequest.builder()
                .code("RD TEST")
                .mode(TransportMode.ROAD)
                .originCity(from)
                .destinationCity(to)
                .distanceKm(890)
                .crossingIds(crossingIds)
                .build();
    }

    @Test
    @DisplayName("a road route through two borders is saved with its crossings in order, and audited")
    void createsRoadRouteWithCrossingsInOrder() {
        CorridorResponse created =
                service.create(khoi, road("Ho Chi Minh City", "Bangkok", List.of(mocBai.getId(), poipet.getId())));

        assertThat(created.crossings()).containsExactly("Mộc Bài – Bavet", "Poipet – Aranyaprathet");
        assertThat(created.dateFlexDays()).isEqualTo(3);
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("CORRIDOR_CREATED"),
                        eq("Added route RD TEST: Ho Chi Minh City → Bangkok by road, via Mộc Bài – Bavet,"
                                + " Poipet – Aranyaprathet."),
                        eq("CORRIDOR"),
                        any(),
                        eq("RD TEST"),
                        any(),
                        any(),
                        any());
    }

    @Test
    @DisplayName("a new route stores the countries of its two ends and passes through each crossing's (US-F3-19)")
    void storesTheRoutesCountries() {
        CorridorResponse created =
                service.create(khoi, road("Ho Chi Minh City", "Bangkok", List.of(mocBai.getId(), poipet.getId())));

        assertThat(created.countries()).containsExactly("VN", "KH", "TH");
    }

    @Test
    @DisplayName("a city without a place can't be an end of a route")
    void refusesCityWithoutPlace() {
        when(places.findByCityIgnoreCase("Siem Reap")).thenReturn(List.of());

        assertThatThrownBy(() -> service.create(khoi, road("Phnom Penh", "Siem Reap", List.of())))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No place in Siem Reap yet");
        verify(corridors, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("crossings out of order are refused, naming where the route is")
    void refusesCrossingsOutOfOrder() {
        assertThatThrownBy(() -> service.create(
                        khoi, road("Ho Chi Minh City", "Bangkok", List.of(poipet.getId(), mocBai.getId()))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("but the route is in Vietnam at that point");
    }

    @Test
    @DisplayName("a road route that changes country needs the crossing into the destination")
    void refusesMissingCrossing() {
        assertThatThrownBy(() -> service.create(khoi, road("Ho Chi Minh City", "Bangkok", List.of(mocBai.getId()))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("the route is in Cambodia, but the destination is in Thailand");
        assertThatThrownBy(() -> service.create(khoi, road("Ho Chi Minh City", "Phnom Penh", List.of())))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Add the border crossings it takes");
    }

    @Test
    @DisplayName("an air route takes no land crossings")
    void refusesAirRouteWithCrossings() {
        CreateCorridorRequest air = road("Ho Chi Minh City", "Phnom Penh", List.of(mocBai.getId())).toBuilder()
                .mode(TransportMode.AIR)
                .build();

        assertThatThrownBy(() -> service.create(khoi, air))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("An air route crosses no land border");
    }

    @Test
    @DisplayName("a used code, or a route that already runs this way by this mode, is a conflict")
    void refusesDuplicates() {
        when(corridors.existsByCodeIgnoreCase("RD TEST")).thenReturn(true);
        assertThatThrownBy(() -> service.create(khoi, road("Ho Chi Minh City", "Phnom Penh", List.of(mocBai.getId()))))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already used");

        when(corridors.existsByCodeIgnoreCase(anyString())).thenReturn(false);
        when(corridors.existsByModeAndOriginCityIgnoreCaseAndDestinationCityIgnoreCase(
                        TransportMode.ROAD, "Ho Chi Minh City", "Phnom Penh"))
                .thenReturn(true);
        assertThatThrownBy(() -> service.create(khoi, road("Ho Chi Minh City", "Phnom Penh", List.of(mocBai.getId()))))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("We already run Ho Chi Minh City → Phnom Penh by road");
    }

    @Test
    @DisplayName("both ends in one city, or flex days outside 0 to 7, are refused")
    void refusesSameCityAndBadFlex() {
        assertThatThrownBy(() -> service.create(khoi, road("Bangkok", "bangkok", List.of())))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("both ends are Bangkok");
        CreateCorridorRequest wide = road("Ho Chi Minh City", "Phnom Penh", List.of(mocBai.getId())).toBuilder()
                .dateFlexDays(9)
                .build();
        assertThatThrownBy(() -> service.create(khoi, wide))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("0 to 7 days");
    }
}
