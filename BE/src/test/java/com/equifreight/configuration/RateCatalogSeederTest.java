package com.equifreight.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.rate.PublishRequest;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.RateLineRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RateServiceClassRepository;
import com.equifreight.repository.RateVolumeBreakRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.RateCatalogService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** Spec §5.4: the demo rate catalog, published once on top of Flow 3's empty v1. */
class RateCatalogSeederTest {

    RateCatalogVersionRepository versions;
    RateLineRepository lines;
    RateServiceClassRepository classes;
    RateVolumeBreakRepository breaks;
    RatePolicyRepository policies;
    RateFeeBandRepository feeBands;
    CorridorRepository corridors;
    RateCatalogService catalog;
    RateCatalogSeeder seeder;
    User lan;
    Corridor pnhHkg;
    Corridor hcmBkk;
    Corridor hanVte;

    @BeforeEach
    void setUp() {
        versions = mock(RateCatalogVersionRepository.class);
        lines = mock(RateLineRepository.class);
        classes = mock(RateServiceClassRepository.class);
        breaks = mock(RateVolumeBreakRepository.class);
        policies = mock(RatePolicyRepository.class);
        feeBands = mock(RateFeeBandRepository.class);
        corridors = mock(CorridorRepository.class);
        UserRepository users = mock(UserRepository.class);
        catalog = mock(RateCatalogService.class);
        seeder = new RateCatalogSeeder(versions, lines, classes, breaks, policies, feeBands, corridors, users, catalog);
        lan = new User();
        lan.setId(UUID.randomUUID());
        when(users.getByEmail("lan.nguyen@equifreight.vn")).thenReturn(lan);
        pnhHkg = corridor("AIR PNH → HKG", TransportMode.AIR, "Phnom Penh", "Hong Kong", 0);
        hcmBkk = corridor("RD HCM → BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", 2);
        hanVte = corridor("RD HAN → VTE", TransportMode.ROAD, "Hanoi", "Vientiane", 1);
        when(corridors.findAll()).thenReturn(List.of(pnhHkg, hcmBkk, hanVte));
        when(versions.findByStatus(CatalogStatus.DRAFT)).thenReturn(Optional.empty());
        when(versions.saveAndFlush(any())).thenAnswer(i -> {
            RateCatalogVersion v = i.getArgument(0);
            v.setId(UUID.randomUUID());
            return v;
        });
    }

    static Corridor corridor(String code, TransportMode mode, String from, String to, int crossings) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(mode);
        c.setOriginCity(from);
        c.setDestinationCity(to);
        for (int i = 0; i < crossings; i++) {
            c.getCrossings().add(new CorridorCrossing());
        }
        return c;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static <T> ArgumentCaptor<List<T>> listCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(List.class);
    }

    List<RateLine> seededLines() {
        ArgumentCaptor<List<RateLine>> captor = listCaptor();
        verify(lines).saveAll(captor.capture());
        return captor.getValue();
    }

    List<String> codesOn(List<RateLine> all, Corridor corridor) {
        return all.stream()
                .filter(l -> l.getCorridor() == corridor)
                .map(RateLine::getCode)
                .toList();
    }

    @Test
    void seedsV2OverAnEmptyPublishedV1() {
        when(versions.maxVersionNo()).thenReturn(1);

        seeder.seed();

        ArgumentCaptor<RateCatalogVersion> draft = ArgumentCaptor.forClass(RateCatalogVersion.class);
        verify(versions).saveAndFlush(draft.capture());
        assertThat(draft.getValue().getVersionNo()).isEqualTo(2);
        assertThat(draft.getValue().getStatus()).isEqualTo(CatalogStatus.DRAFT);
        verify(catalog).publish(eq(lan), eq(new PublishRequest("Demo rates for the corridors we run")));

        List<RateLine> all = seededLines();
        assertThat(all).allSatisfy(l -> assertThat(l.getVersion()).isSameAs(draft.getValue()));
        assertThat(codesOn(all, null))
                .contains(
                        "LOADING",
                        "ISO_STALLION",
                        "ISO_MARE",
                        "ISO_GELDING",
                        "VET_BLOODS",
                        "GROOM",
                        "HEALTH_CERT",
                        "POST_ISO",
                        "WAITING")
                .doesNotContain("CROSSING");
        assertThat(codesOn(all, pnhHkg))
                .containsExactlyInAnyOrder(
                        "TRANSFER_ORIGIN", "TRANSFER_DEST", "HANDLING", "GROOM", "FLIGHT_VET", "IMPORT_PERMIT");
        assertThat(codesOn(all, hcmBkk)).containsExactlyInAnyOrder("ROAD_SHARED", "ROAD_PRIVATE", "CROSSING");
        assertThat(codesOn(all, hanVte)).containsExactly("ROAD_SHARED");
        assertThat(all.stream().filter(l -> l.getBasis() == RateBasis.PER_HOUR))
                .allSatisfy(l -> assertThat(l.getDefaultQuantity()).isNotNull());

        ArgumentCaptor<List<RateServiceClass>> stalls = listCaptor();
        verify(classes).saveAll(stalls.capture());
        assertThat(stalls.getValue())
                .hasSize(3)
                .allSatisfy(c -> assertThat(c.getCorridor()).isSameAs(pnhHkg));

        ArgumentCaptor<List<RatePolicy>> seededPolicies = listCaptor();
        verify(policies).saveAll(seededPolicies.capture());
        assertThat(seededPolicies.getValue())
                .extracting(p -> p.getKey())
                .containsExactlyInAnyOrder(RatePolicyKey.values());
        assertThat(seededPolicies.getValue())
                .filteredOn(p -> p.getKey() == RatePolicyKey.ESTIMATE_BAND_PCT)
                .singleElement()
                .satisfies(p -> assertThat(p.getValue()).isEqualByComparingTo("15"));
        verify(breaks).saveAll(anyList());
        verify(feeBands).saveAll(anyList());
    }

    @Test
    void seedsV1OnAnEmptyDatabase() {
        when(versions.maxVersionNo()).thenReturn(null);

        seeder.seed();

        ArgumentCaptor<RateCatalogVersion> draft = ArgumentCaptor.forClass(RateCatalogVersion.class);
        verify(versions).saveAndFlush(draft.capture());
        assertThat(draft.getValue().getVersionNo()).isEqualTo(1);
    }

    @Test
    void doesNothingWhenRatesExist() {
        when(lines.existsBy()).thenReturn(true);

        seeder.seed();

        verify(versions, never()).saveAndFlush(any());
        verify(catalog, never()).publish(any(), any());
    }
}
