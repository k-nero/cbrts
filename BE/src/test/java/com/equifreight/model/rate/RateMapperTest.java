package com.equifreight.model.rate;

import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.TransportMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** US-Q-10 (#31): the Rates page's frame is built in the area's mapper. */
class RateMapperTest {

    static RateCatalogVersion version(int no, CatalogStatus status) {
        RateCatalogVersion v = new RateCatalogVersion();
        v.setId(UUID.randomUUID());
        v.setVersionNo(no);
        v.setStatus(status);
        return v;
    }

    static Corridor corridor(String code) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(TransportMode.ROAD);
        return c;
    }

    @Test
    void theCatalogNamesTheCurrentAndDraftVersionsAndCarriesTheCounts() {
        RateCatalogVersion v3 = version(3, CatalogStatus.DRAFT);
        RateCatalogVersion v2 = version(2, CatalogStatus.PUBLISHED);
        RateCatalogVersion v1 = version(1, CatalogStatus.RETIRED);
        Corridor hanVte = corridor("RD HAN → VTE");
        Corridor sgnPnh = corridor("RD SGN → PNH");

        RateCatalogResponse response = RateMapper.toCatalogResponse(
                List.of(v3, v2, v1), Map.of(v1.getId(), 4L), List.of(hanVte, sgnPnh), Map.of(hanVte.getId(), 2));

        assertThat(response.currentVersionId()).isEqualTo(v2.getId());
        assertThat(response.draftVersionId()).isEqualTo(v3.getId());
        assertThat(response.versions())
                .extracting(RateVersionResponse::versionNo, RateVersionResponse::quotationsPinned)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(3, 0L),
                        org.assertj.core.groups.Tuple.tuple(2, 0L),
                        org.assertj.core.groups.Tuple.tuple(1, 4L));
        assertThat(response.corridors())
                .extracting(RateCorridorResponse::code, RateCorridorResponse::missingCount)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("RD HAN → VTE", 2),
                        org.assertj.core.groups.Tuple.tuple("RD SGN → PNH", 0));
    }

    @Test
    void anEmptyCatalogHasNoCurrentOrDraft() {
        RateCatalogResponse response = RateMapper.toCatalogResponse(List.of(), Map.of(), List.of(), Map.of());

        assertThat(response.currentVersionId()).isNull();
        assertThat(response.draftVersionId()).isNull();
        assertThat(response.versions()).isEmpty();
    }
}
