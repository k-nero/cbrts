package com.equifreight.service.pricing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.RateVolumeBreak;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.RateLineRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RateServiceClassRepository;
import com.equifreight.repository.RateVolumeBreakRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RateSetLoaderTest {

    RateCatalogVersionRepository versions;
    RateLineRepository lines;
    RateServiceClassRepository classes;
    RateVolumeBreakRepository breaks;
    RatePolicyRepository policies;
    RateFeeBandRepository feeBands;
    RateSetLoader loader;

    RateCatalogVersion version;
    Corridor pnhHkg;
    Corridor hcmBkk;

    @BeforeEach
    void setUp() {
        versions = mock(RateCatalogVersionRepository.class);
        lines = mock(RateLineRepository.class);
        classes = mock(RateServiceClassRepository.class);
        breaks = mock(RateVolumeBreakRepository.class);
        policies = mock(RatePolicyRepository.class);
        feeBands = mock(RateFeeBandRepository.class);
        loader = new RateSetLoader(versions, lines, classes, breaks, policies, feeBands);
        version = new RateCatalogVersion();
        version.setId(UUID.randomUUID());
        version.setVersionNo(2);
        pnhHkg = corridor();
        hcmBkk = corridor();
        when(versions.findById(version.getId())).thenReturn(Optional.of(version));
    }

    static Corridor corridor() {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        return c;
    }

    RateLine rateLine(Corridor corridor, String code, String group, String rate) {
        RateLine l = new RateLine();
        l.setId(UUID.randomUUID());
        l.setVersion(version);
        l.setCorridor(corridor);
        l.setCode(code);
        l.setGroupCode(group);
        l.setDescription(code);
        l.setBasis(RateBasis.PER_THREE_HORSES);
        l.setRate(new BigDecimal(rate));
        return l;
    }

    RateVolumeBreak band(Corridor corridor, int min, Integer max, String pct) {
        RateVolumeBreak b = new RateVolumeBreak();
        b.setVersion(version);
        b.setCorridor(corridor);
        b.setMinHorses((short) min);
        b.setMaxHorses(max == null ? null : max.shortValue());
        b.setDiscountPct(new BigDecimal(pct));
        return b;
    }

    RateServiceClass serviceClass(Corridor corridor, ServiceClass sc) {
        RateServiceClass c = new RateServiceClass();
        c.setId(UUID.randomUUID());
        c.setVersion(version);
        c.setCorridor(corridor);
        c.setServiceClass(sc);
        c.setWidthPerHorseIn((short) 48);
        c.setHorsesPerPosition((short) 2);
        c.setPositionRate(new BigDecimal("16800"));
        return c;
    }

    @Test
    void aCorridorLineReplacesTheEveryCorridorLineWithItsCode() {
        when(lines.findByVersionId(version.getId()))
                .thenReturn(List.of(
                        rateLine(null, "GROOM", "D", "480"),
                        rateLine(pnhHkg, "GROOM", "D", "1450"),
                        rateLine(null, "LOADING", "A", "120"),
                        rateLine(hcmBkk, "ROAD", "C", "2.4")));

        RateSet set = loader.load(version.getId()).forCorridor(pnhHkg.getId());

        assertThat(set.versionNo()).isEqualTo(2);
        assertThat(set.lines())
                .extracting(RateRow::code, r -> r.rate().toPlainString(), RateRow::everyCorridor)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("LOADING", "120", true),
                        org.assertj.core.groups.Tuple.tuple("GROOM", "1450", false));
    }

    @Test
    void corridorBreaksReplaceGlobalBreaks() {
        when(breaks.findByVersionId(version.getId()))
                .thenReturn(List.of(band(null, 1, null, "0"), band(pnhHkg, 1, 1, "0"), band(pnhHkg, 2, null, "8")));

        CatalogRows rows = loader.load(version.getId());

        assertThat(rows.forCorridor(pnhHkg.getId()).breaks())
                .containsExactly(new BreakRow(1, 1, new BigDecimal("0")), new BreakRow(2, null, new BigDecimal("8")));
        assertThat(rows.forCorridor(hcmBkk.getId()).breaks()).containsExactly(new BreakRow(1, null, BigDecimal.ZERO));
    }

    @Test
    void policiesBecomeAMap() {
        RatePolicy fuel = new RatePolicy();
        fuel.setVersion(version);
        fuel.setKey(RatePolicyKey.FUEL_PCT);
        fuel.setValue(new BigDecimal("18.000"));
        when(policies.findByVersionId(version.getId())).thenReturn(List.of(fuel));

        assertThat(loader.load(version.getId()).forCorridor(pnhHkg.getId()).policies())
                .containsEntry(RatePolicyKey.FUEL_PCT, new BigDecimal("18.000"));
    }

    @Test
    void classesAreOnlyTheCorridors() {
        when(classes.findByVersionId(version.getId()))
                .thenReturn(
                        List.of(serviceClass(pnhHkg, ServiceClass.BUSINESS), serviceClass(hcmBkk, ServiceClass.FIRST)));

        assertThat(loader.load(version.getId()).forCorridor(pnhHkg.getId()).classes())
                .extracting(ClassRow::serviceClass)
                .containsExactly(ServiceClass.BUSINESS);
    }

    @Test
    void anUnknownVersionIsNotFound() {
        UUID unknown = UUID.randomUUID();
        when(versions.findById(unknown)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> loader.load(unknown)).isInstanceOf(ResourceNotFoundException.class);
    }
}
