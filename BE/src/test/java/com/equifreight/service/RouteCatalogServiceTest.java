package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.route.CreateBorderCrossingRequest;
import com.equifreight.model.route.CreatePlaceRequest;
import com.equifreight.model.route.PlaceResponse;
import com.equifreight.repository.BorderCrossingRepository;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.PlaceRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** The fleet & route coordinator adds the places and border crossings a new route needs. */
class RouteCatalogServiceTest {

    private final PlaceRepository places = mock(PlaceRepository.class);
    private final BorderCrossingRepository crossings = mock(BorderCrossingRepository.class);
    private final CountryRepository countries = mock(CountryRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final CatalogUsage usage = mock(CatalogUsage.class);
    private final User khoi = new User();
    private final Country kh = new Country();
    private RouteCatalogService service;

    @BeforeEach
    void setUp() {
        service = new RouteCatalogService(places, crossings, countries, audit, usage);
        kh.setId(UUID.randomUUID());
        kh.setCode("KH");
        kh.setName("Cambodia");
        when(countries.findById(kh.getId())).thenReturn(Optional.of(kh));
        when(places.saveAndFlush(any(Place.class))).thenAnswer(inv -> {
            Place p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });
    }

    private CreatePlaceRequest stables(String name) {
        return CreatePlaceRequest.builder()
                .name(name)
                .kind(PlaceKind.STABLE)
                .city(" Siem Reap ")
                .countryId(kh.getId())
                .address(" ")
                .build();
    }

    @Test
    @DisplayName("a new place is saved trimmed, in its country, and audited")
    void createsPlace() {
        PlaceResponse created = service.createPlace(khoi, stables("Angkor stables"));

        assertThat(created.city()).isEqualTo("Siem Reap");
        assertThat(created.countryCode()).isEqualTo("KH");
        verify(audit)
                .recordDecision(
                        khoi,
                        "PLACE_CREATED",
                        "Added place Angkor stables in Siem Reap, Cambodia.",
                        "PLACE",
                        created.id(),
                        null,
                        null,
                        null,
                        null);
    }

    @Test
    @DisplayName("a second place with the same name in the same city is a conflict")
    void refusesDuplicatePlace() {
        when(places.existsByNameIgnoreCaseAndCityIgnoreCase("Angkor stables", "Siem Reap"))
                .thenReturn(true);

        assertThatThrownBy(() -> service.createPlace(khoi, stables("Angkor stables")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Siem Reap already has a place called Angkor stables.");
        verify(places, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("a border crossing joins two different countries")
    void refusesCrossingWithinOneCountry() {
        CreateBorderCrossingRequest same = CreateBorderCrossingRequest.builder()
                .name("Nowhere")
                .fromCountryId(kh.getId())
                .toCountryId(kh.getId())
                .build();

        assertThatThrownBy(() -> service.createBorderCrossing(khoi, same))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A border crossing joins two different countries.");
        verify(crossings, never()).saveAndFlush(any(BorderCrossing.class));
    }

    private Place siemReapStables() {
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setName("Siem Reap stables");
        p.setKind(PlaceKind.STABLE);
        p.setCity("Siem Reap");
        p.setCountry(kh);
        when(places.findById(p.getId())).thenReturn(Optional.of(p));
        return p;
    }

    @Test
    @DisplayName("a place is renamed in its own city even while requests use it")
    void renamesAPlaceInUse() {
        Place p = siemReapStables();
        when(usage.placeInUse(p)).thenReturn(Optional.of("Requests start or end at Siem Reap stables."));

        PlaceResponse saved = service.updatePlace(khoi, p.getId(), stables("Angkor stables"));

        assertThat(saved.name()).isEqualTo("Angkor stables");
        assertThat(saved.city()).isEqualTo("Siem Reap");
    }

    @Test
    @DisplayName("a place in use can't move to another city")
    void refusesMovingAPlaceInUse() {
        Place p = siemReapStables();
        when(usage.placeInUse(p)).thenReturn(Optional.of("Requests start or end at Siem Reap stables."));
        CreatePlaceRequest moved =
                stables("Siem Reap stables").toBuilder().city("Battambang").build();

        assertThatThrownBy(() -> service.updatePlace(khoi, p.getId(), moved))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Requests start or end at Siem Reap stables. It stays in Siem Reap.");
        assertThat(p.getCity()).isEqualTo("Siem Reap");
    }

    @Test
    @DisplayName("the last place in a city a route runs to can't be deleted")
    void refusesDeletingTheLastPlaceOfARouteCity() {
        Place p = siemReapStables();
        when(usage.placeInUse(p)).thenReturn(Optional.empty());
        when(usage.lastPlaceOfCity(p)).thenReturn(Optional.of("Siem Reap stables is the last place in Siem Reap."));

        assertThatThrownBy(() -> service.deletePlace(khoi, p.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Siem Reap stables is the last place in Siem Reap.");
        verify(places, never()).delete(any(Place.class));
    }

    @Test
    @DisplayName("a place nothing needs is deleted")
    void deletesAnUnusedPlace() {
        Place p = siemReapStables();
        when(usage.placeInUse(p)).thenReturn(Optional.empty());
        when(usage.lastPlaceOfCity(p)).thenReturn(Optional.empty());

        service.deletePlace(khoi, p.getId());

        verify(places).delete(p);
    }

    private BorderCrossing poipet(Country th) {
        BorderCrossing b = new BorderCrossing();
        b.setId(UUID.randomUUID());
        b.setName("Poipet – Aranyaprathet");
        b.setFromCountry(kh);
        b.setToCountry(th);
        when(crossings.findById(b.getId())).thenReturn(Optional.of(b));
        when(crossings.saveAndFlush(any(BorderCrossing.class))).thenAnswer(inv -> inv.getArgument(0));
        return b;
    }

    private Country thailand() {
        Country th = new Country();
        th.setId(UUID.randomUUID());
        th.setCode("TH");
        th.setName("Thailand");
        when(countries.findById(th.getId())).thenReturn(Optional.of(th));
        return th;
    }

    @Test
    @DisplayName("a crossing a route takes can't join other countries")
    void refusesMovingACrossingInUse() {
        Country th = thailand();
        Country la = new Country();
        la.setId(UUID.randomUUID());
        la.setName("Laos");
        when(countries.findById(la.getId())).thenReturn(Optional.of(la));
        BorderCrossing b = poipet(th);
        when(usage.crossingInUse(b)).thenReturn(Optional.of("RD PNH → BKK takes Poipet – Aranyaprathet."));
        CreateBorderCrossingRequest moved = CreateBorderCrossingRequest.builder()
                .name("Poipet – Aranyaprathet")
                .fromCountryId(kh.getId())
                .toCountryId(la.getId())
                .build();

        assertThatThrownBy(() -> service.updateBorderCrossing(khoi, b.getId(), moved))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Its countries stay as they are.");
    }

    @Test
    @DisplayName("a crossing in use can still be renamed and turned the other way")
    void renamesACrossingInUse() {
        Country th = thailand();
        BorderCrossing b = poipet(th);
        when(usage.crossingInUse(b)).thenReturn(Optional.of("RD PNH → BKK takes Poipet – Aranyaprathet."));
        CreateBorderCrossingRequest renamed = CreateBorderCrossingRequest.builder()
                .name("Aranyaprathet – Poipet")
                .fromCountryId(th.getId())
                .toCountryId(kh.getId())
                .roadOnly(true)
                .build();

        service.updateBorderCrossing(khoi, b.getId(), renamed);

        assertThat(b.getName()).isEqualTo("Aranyaprathet – Poipet");
        assertThat(b.isRoadOnly()).isTrue();
    }

    @Test
    @DisplayName("a crossing in use can't be deleted")
    void refusesDeletingACrossingInUse() {
        BorderCrossing b = poipet(thailand());
        when(usage.crossingInUse(b)).thenReturn(Optional.of("RD PNH → BKK takes Poipet – Aranyaprathet."));

        assertThatThrownBy(() -> service.deleteBorderCrossing(khoi, b.getId())).isInstanceOf(ConflictException.class);
        verify(crossings, never()).delete(any(BorderCrossing.class));
    }
}
