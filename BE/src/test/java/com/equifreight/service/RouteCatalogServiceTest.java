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
    private final User khoi = new User();
    private final Country kh = new Country();
    private RouteCatalogService service;

    @BeforeEach
    void setUp() {
        service = new RouteCatalogService(places, crossings, countries, audit);
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
}
