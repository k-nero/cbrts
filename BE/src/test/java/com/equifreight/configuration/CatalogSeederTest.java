package com.equifreight.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.RegulationCatalog;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.repository.BorderCrossingRepository;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RegulationCatalogRepository;
import com.equifreight.repository.RegulationVersionRepository;
import com.equifreight.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** Spec §7: the demo places, crossings, corridors and regulation versions, seeded once. */
class CatalogSeederTest {

    private static final Map<String, String> NAMES = Map.of(
            "VN", "Vietnam", "KH", "Cambodia", "TH", "Thailand", "LA", "Laos", "MY", "Malaysia", "HK", "Hong Kong");

    private PlaceRepository places;
    private BorderCrossingRepository crossings;
    private CorridorRepository corridors;
    private RegulationCatalogRepository catalogs;
    private RegulationVersionRepository versions;
    private CatalogSeeder seeder;
    private User lan;

    @BeforeEach
    void setUp() {
        places = mock(PlaceRepository.class);
        crossings = mock(BorderCrossingRepository.class);
        corridors = mock(CorridorRepository.class);
        CountryRepository countries = mock(CountryRepository.class);
        catalogs = mock(RegulationCatalogRepository.class);
        versions = mock(RegulationVersionRepository.class);
        UserRepository users = mock(UserRepository.class);
        seeder = new CatalogSeeder(places, crossings, corridors, countries, catalogs, versions, users);

        NAMES.forEach((code, name) -> {
            Country c = new Country();
            c.setCode(code);
            c.setName(name);
            when(countries.findByCode(code)).thenReturn(Optional.of(c));
        });
        lan = new User();
        when(users.getByEmail("lan.nguyen@equifreight.vn")).thenReturn(lan);
        when(places.save(any(Place.class))).thenAnswer(inv -> inv.getArgument(0));
        when(crossings.save(any(BorderCrossing.class))).thenAnswer(inv -> inv.getArgument(0));
        when(corridors.save(any(Corridor.class))).thenAnswer(inv -> inv.getArgument(0));
        when(catalogs.save(any(RegulationCatalog.class))).thenAnswer(inv -> {
            RegulationCatalog c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        when(versions.save(any(RegulationVersion.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("every seeded corridor's countries agree with its border crossings (US-F7-01)")
    void corridorCountriesAgreeWithCrossings() {
        assertThat(CatalogSeeder.inconsistentCorridors()).isEmpty();
    }

    @Test
    void firstStartSeedsTheCatalog() {
        when(places.findByName(anyString())).thenReturn(Optional.empty());
        when(crossings.findByName(anyString())).thenReturn(Optional.empty());
        when(corridors.findByCode(anyString())).thenReturn(Optional.empty());
        when(catalogs.findByCountryCode(anyString())).thenReturn(Optional.empty());
        when(versions.findByCatalogId(any())).thenReturn(List.of());

        seeder.seed();

        verify(places, times(11)).save(any(Place.class));
        verify(crossings, times(5)).save(any(BorderCrossing.class));
        ArgumentCaptor<Corridor> corridor = ArgumentCaptor.forClass(Corridor.class);
        verify(corridors, times(11)).save(corridor.capture());
        Corridor hcmBkk = corridor.getAllValues().stream()
                .filter(c -> c.getCode().equals("RD HCM → BKK"))
                .findFirst()
                .orElseThrow();
        assertThat(hcmBkk.getCrossings().stream()
                        .sorted(Comparator.comparingInt(cc -> cc.getSeq()))
                        .map(cc -> cc.getSeq() + " " + cc.getBorderCrossing().getName()))
                .containsExactly("1 Mộc Bài – Bavet", "2 Poipet – Aranyaprathet");
        assertThat(hcmBkk.getDistanceKm()).isEqualTo(960);

        ArgumentCaptor<RegulationCatalog> catalog = ArgumentCaptor.forClass(RegulationCatalog.class);
        verify(catalogs, times(6)).save(catalog.capture());
        assertThat(catalog.getAllValues())
                .extracting(RegulationCatalog::getName)
                .contains("Laos import");
        ArgumentCaptor<RegulationVersion> version = ArgumentCaptor.forClass(RegulationVersion.class);
        verify(versions, times(6)).save(version.capture());
        RegulationVersion laos = version.getAllValues().stream()
                .filter(v -> v.getCatalog().getCountry().getCode().equals("LA"))
                .findFirst()
                .orElseThrow();
        assertThat(laos.getVersionNo()).isEqualTo(3);
        assertThat(laos.getLeadTimeDays()).isEqualTo((short) 30);
        assertThat(laos.getDomesticLeadTimeDays()).isEqualTo((short) 3);
        assertThat(laos.getStatus()).isEqualTo(CatalogStatus.PUBLISHED);
        assertThat(laos.getPublishedBy()).isSameAs(lan);
        assertThat(laos.getQuarantineMinDays()).isEqualTo((short) 7);
        assertThat(laos.getArrivalBufferDays()).isEqualTo((short) 2);
    }

    @Test
    void aCorridorSeededUnderAnotherCodeIsReusedAndGetsItsCrossing() {
        when(places.findByName(anyString())).thenReturn(Optional.of(new Place()));
        when(crossings.findByName(anyString())).thenReturn(Optional.empty());
        when(corridors.findByCode(anyString())).thenReturn(Optional.empty());
        Corridor flow3 = new Corridor();
        flow3.setCode("RD HCM -> PNH");
        flow3.setMode(com.equifreight.entity.enums.TransportMode.ROAD);
        flow3.setOriginCity("Ho Chi Minh City");
        flow3.setDestinationCity("Phnom Penh");
        when(corridors.findBetweenCities(anyString(), anyString())).thenReturn(List.of());
        when(corridors.findBetweenCities("Ho Chi Minh City", "Phnom Penh")).thenReturn(List.of(flow3));
        when(catalogs.findByCountryCode(anyString())).thenReturn(Optional.empty());
        when(versions.findByCatalogId(any())).thenReturn(List.of());

        seeder.seed();

        ArgumentCaptor<Corridor> corridor = ArgumentCaptor.forClass(Corridor.class);
        verify(corridors, times(11)).save(corridor.capture());
        assertThat(corridor.getAllValues())
                .extracting(Corridor::getCode)
                .contains("RD HCM -> PNH")
                .doesNotContain("RD HCM → PNH");
        assertThat(flow3.getCrossings())
                .singleElement()
                .satisfies(cc -> assertThat(cc.getBorderCrossing().getName()).isEqualTo("Mộc Bài – Bavet"));
    }

    @Test
    void restartAddsNothing() {
        when(places.findByName(anyString())).thenReturn(Optional.of(new Place()));
        when(crossings.findByName(anyString())).thenReturn(Optional.of(new BorderCrossing()));
        when(corridors.findByCode(anyString())).thenReturn(Optional.of(new Corridor()));
        RegulationCatalog existing = new RegulationCatalog();
        existing.setId(UUID.randomUUID());
        when(catalogs.findByCountryCode(anyString())).thenReturn(Optional.of(existing));
        when(versions.findByCatalogId(existing.getId())).thenReturn(List.of(new RegulationVersion()));

        seeder.seed();

        verify(places, never()).save(any());
        verify(crossings, never()).save(any());
        verify(corridors, never()).save(any());
        verify(catalogs, never()).save(any());
        verify(versions, never()).save(any());
    }
}
