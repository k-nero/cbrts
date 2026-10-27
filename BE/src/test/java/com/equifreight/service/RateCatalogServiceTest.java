package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.rate.RateCatalogResponse;
import com.equifreight.model.rate.RateCorridorView;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.RateLineRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RateServiceClassRepository;
import com.equifreight.repository.RateVolumeBreakRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.RateSetLoader;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

/** US-Q-10 (#31): reading the rate catalog per corridor, with its missing rates. */
class RateCatalogServiceTest {

    static final Instant NOW = Instant.parse("2026-10-19T03:00:00Z");

    RateCatalogVersionRepository versions;
    RateSetLoader loader;
    CorridorRepository corridors;
    QuotationRepository quotations;
    RateLineRepository lines;
    RateServiceClassRepository classes;
    RateVolumeBreakRepository breaks;
    RatePolicyRepository policies;
    RateFeeBandRepository feeBands;
    AuditService audit;
    RateCatalogService service;

    User lan;
    RateCatalogVersion v1;
    RateCatalogVersion v2;
    Corridor pnhHkg;
    Corridor hanVte;

    @BeforeEach
    void setUp() {
        versions = mock(RateCatalogVersionRepository.class);
        loader = mock(RateSetLoader.class);
        corridors = mock(CorridorRepository.class);
        quotations = mock(QuotationRepository.class);
        lines = mock(RateLineRepository.class);
        classes = mock(RateServiceClassRepository.class);
        breaks = mock(RateVolumeBreakRepository.class);
        policies = mock(RatePolicyRepository.class);
        feeBands = mock(RateFeeBandRepository.class);
        audit = mock(AuditService.class);
        service = new RateCatalogService(
                versions,
                loader,
                corridors,
                quotations,
                lines,
                classes,
                breaks,
                policies,
                feeBands,
                audit,
                Clock.fixed(NOW, BusinessTime.ZONE));

        lan = new User();
        lan.setId(UUID.randomUUID());
        lan.setFirstName("Thị Lan");
        lan.setLastName("Nguyễn");
        v1 = version(1, CatalogStatus.RETIRED);
        v2 = version(2, CatalogStatus.PUBLISHED);
        v2.setPublishedBy(lan);
        v2.setChangeNote("Demo rates for the corridors we run");
        pnhHkg = corridor("AIR PNH → HKG", TransportMode.AIR, "Phnom Penh", "Hong Kong", 1550);
        hanVte = corridor("RD HAN → VTE", TransportMode.ROAD, "Hanoi", "Vientiane", 780);
        when(versions.findAllByOrderByVersionNoDesc()).thenReturn(List.of(v2, v1));
        when(corridors.findAll(any(Sort.class))).thenReturn(List.of(pnhHkg, hanVte));
        when(corridors.findById(pnhHkg.getId())).thenReturn(Optional.of(pnhHkg));
        when(corridors.findById(hanVte.getId())).thenReturn(Optional.of(hanVte));
        when(quotations.countByRateCatalogVersionId(v1.getId())).thenReturn(1L);
    }

    static RateCatalogVersion version(int no, CatalogStatus status) {
        RateCatalogVersion v = new RateCatalogVersion();
        v.setId(UUID.randomUUID());
        v.setVersionNo(no);
        v.setStatus(status);
        v.setPublishedAt(NOW);
        return v;
    }

    static Corridor corridor(String code, TransportMode mode, String from, String to, int km) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(mode);
        c.setOriginCity(from);
        c.setDestinationCity(to);
        c.setDistanceKm(km);
        return c;
    }

    static RateLine line(RateCatalogVersion v, Corridor corridor, String code, String group, RateBasis basis) {
        RateLine l = new RateLine();
        l.setId(UUID.randomUUID());
        l.setVersion(v);
        l.setCorridor(corridor);
        l.setCode(code);
        l.setGroupCode(group);
        l.setDescription(code);
        l.setBasis(basis);
        l.setRate(new BigDecimal("100"));
        l.setCertainty(RateCertainty.FIXED);
        return l;
    }

    static RateLine isolation(RateCatalogVersion v, HorseSex sex) {
        RateLine l = line(v, null, "ISO_" + sex, "B", RateBasis.PER_DAY);
        l.setAppliesToSex(sex);
        return l;
    }

    static RateServiceClass stall(RateCatalogVersion v, Corridor corridor, ServiceClass sc, int width) {
        RateServiceClass c = new RateServiceClass();
        c.setId(UUID.randomUUID());
        c.setVersion(v);
        c.setCorridor(corridor);
        c.setServiceClass(sc);
        c.setWidthPerHorseIn((short) width);
        c.setHorsesPerPosition((short) (96 / width));
        c.setPositionRate(new BigDecimal("16800"));
        return c;
    }

    static List<RatePolicy> percentages(RateCatalogVersion v) {
        List<RatePolicy> list = new ArrayList<>();
        for (RatePolicyKey key : List.of(
                RatePolicyKey.FUEL_PCT,
                RatePolicyKey.INSURANCE_PCT,
                RatePolicyKey.CONTINGENCY_PCT,
                RatePolicyKey.SERVICE_FEE_PCT,
                RatePolicyKey.ESTIMATE_BAND_PCT)) {
            RatePolicy p = new RatePolicy();
            p.setVersion(v);
            p.setKey(key);
            p.setValue(BigDecimal.TEN);
            list.add(p);
        }
        // The air weight limits (BR-Q-16), so a complete corridor misses nothing.
        for (RatePolicyKey key : List.of(RatePolicyKey.STALL_PAYLOAD_KG, RatePolicyKey.AIR_SHIPMENT_MAX_KG)) {
            RatePolicy p = new RatePolicy();
            p.setVersion(v);
            p.setKey(key);
            p.setValue(new BigDecimal(key == RatePolicyKey.STALL_PAYLOAD_KG ? "5504" : "20000"));
            list.add(p);
        }
        return list;
    }

    /** v2: PNH → HKG complete; HAN → VTE with a shared road rate only (private missing). */
    CatalogRows rowsOf(RateCatalogVersion v) {
        List<RateLine> rateLines = new ArrayList<>(List.of(
                line(v, null, "GROOM", "D", RateBasis.PER_THREE_HORSES),
                isolation(v, HorseSex.STALLION),
                isolation(v, HorseSex.MARE),
                isolation(v, HorseSex.GELDING),
                line(v, pnhHkg, "HANDLING", "C", RateBasis.PER_SHIPMENT),
                line(v, pnhHkg, "FLIGHT_VET", "D", RateBasis.FLIGHT_VET),
                line(v, hanVte, "VET_ESCORT", "D", RateBasis.VET_ESCORT)));
        RateLine shared = line(v, hanVte, "ROAD_SHARED", "C", RateBasis.PER_KM);
        shared.setAppliesToTrailer(com.equifreight.entity.enums.TrailerType.SHARED);
        rateLines.add(shared);
        return new CatalogRows(
                v,
                List.of(
                        stall(v, pnhHkg, ServiceClass.ECONOMY, 32),
                        stall(v, pnhHkg, ServiceClass.BUSINESS, 48),
                        stall(v, pnhHkg, ServiceClass.FIRST, 96)),
                rateLines,
                List.of(),
                percentages(v),
                List.of());
    }

    @Test
    void theCatalogListsVersionsNewestFirstWithPinnedCounts() {
        when(loader.load(v2.getId())).thenReturn(rowsOf(v2));

        RateCatalogResponse catalog = service.catalog();

        assertThat(catalog.currentVersionId()).isEqualTo(v2.getId());
        assertThat(catalog.draftVersionId()).isNull();
        assertThat(catalog.versions())
                .extracting(v -> v.versionNo(), v -> v.quotationsPinned())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(2, 0L), org.assertj.core.groups.Tuple.tuple(1, 1L));
        assertThat(catalog.versions().getFirst().publishedBy()).isEqualTo("Nguyễn Thị Lan");
        assertThat(catalog.corridors())
                .extracting(c -> c.code(), c -> c.missingCount())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("AIR PNH → HKG", 0),
                        org.assertj.core.groups.Tuple.tuple("RD HAN → VTE", 1));
    }

    @Test
    void missingCountsUseTheDraftWhenThereIsOne() {
        RateCatalogVersion v3 = version(3, CatalogStatus.DRAFT);
        v3.setLastEditedBy(lan);
        when(versions.findAllByOrderByVersionNoDesc()).thenReturn(List.of(v3, v2, v1));
        CatalogRows draftRows = rowsOf(v3);
        RateLine priv = line(v3, hanVte, "ROAD_PRIVATE", "C", RateBasis.PER_KM);
        priv.setAppliesToTrailer(com.equifreight.entity.enums.TrailerType.PRIVATE);
        List<RateLine> withPrivate = new ArrayList<>(draftRows.lines());
        withPrivate.add(priv);
        when(loader.load(v3.getId()))
                .thenReturn(new CatalogRows(
                        v3, draftRows.classes(), withPrivate, List.of(), draftRows.policies(), List.of()));

        RateCatalogResponse catalog = service.catalog();

        assertThat(catalog.draftVersionId()).isEqualTo(v3.getId());
        assertThat(catalog.currentVersionId()).isEqualTo(v2.getId());
        assertThat(catalog.versions().getFirst().lastEditedBy()).isEqualTo("Nguyễn Thị Lan");
        assertThat(catalog.corridors())
                .allSatisfy(c -> assertThat(c.missingCount()).isZero());
    }

    @Test
    void theCorridorViewMarksEveryCorridorLines() {
        when(loader.load(v2.getId())).thenReturn(rowsOf(v2));

        RateCorridorView view = service.corridorView(v2.getId(), pnhHkg.getId());

        assertThat(view.versionNo()).isEqualTo(2);
        assertThat(view.status()).isEqualTo(CatalogStatus.PUBLISHED);
        assertThat(view.corridor().code()).isEqualTo("AIR PNH → HKG");
        assertThat(view.serviceClasses())
                .extracting(c -> c.serviceClass(), c -> c.perHorse().toPlainString())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(ServiceClass.ECONOMY, "5600.00"),
                        org.assertj.core.groups.Tuple.tuple(ServiceClass.BUSINESS, "8400.00"),
                        org.assertj.core.groups.Tuple.tuple(ServiceClass.FIRST, "16800.00"));
        assertThat(view.lines())
                .extracting(l -> l.code(), l -> l.everyCorridor())
                .contains(
                        org.assertj.core.groups.Tuple.tuple("GROOM", true),
                        org.assertj.core.groups.Tuple.tuple("HANDLING", false))
                .doesNotContain(org.assertj.core.groups.Tuple.tuple("ROAD_SHARED", false));
        assertThat(view.volumeBreaksScope()).isEqualTo("GLOBAL");
        assertThat(view.missing()).isEmpty();
    }

    @Test
    void theCorridorViewListsMissingRates() {
        when(loader.load(v2.getId())).thenReturn(rowsOf(v2));

        RateCorridorView view = service.corridorView(v2.getId(), hanVte.getId());

        assertThat(view.missing())
                .extracting(m -> m.description())
                .containsExactly("Road freight Hanoi → Vientiane, private trailer");
        assertThat(view.missing().getFirst().why())
                .isEqualTo("Rate catalog v2 has no private-trailer road rate for RD HAN → VTE.");
    }

    @Test
    void anUnknownCorridorIsNotFound() {
        when(loader.load(v2.getId())).thenReturn(rowsOf(v2));
        UUID unknown = UUID.randomUUID();
        when(corridors.findById(unknown)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.corridorView(v2.getId(), unknown))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
