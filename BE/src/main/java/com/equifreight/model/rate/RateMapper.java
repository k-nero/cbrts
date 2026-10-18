package com.equifreight.model.rate;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateFeeBand;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.RateVolumeBreak;
import com.equifreight.entity.User;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.MissingRate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** Rate catalog entities to the Rates page's responses. */
public final class RateMapper {

    private RateMapper() {}

    public static RateVersionResponse toVersionResponse(RateCatalogVersion v, long quotationsPinned) {
        return RateVersionResponse.builder()
                .id(v.getId())
                .versionNo(v.getVersionNo())
                .status(v.getStatus())
                .publishedAt(v.getPublishedAt())
                .publishedBy(name(v.getPublishedBy()))
                .changeNote(v.getChangeNote())
                .quotationsPinned(quotationsPinned)
                .lastEditedBy(name(v.getLastEditedBy()))
                .updatedAt(v.getUpdatedAt())
                .build();
    }

    public static RateCorridorResponse toCorridorResponse(Corridor c, int missingCount) {
        return RateCorridorResponse.builder()
                .id(c.getId())
                .code(c.getCode())
                .mode(c.getMode())
                .fromCity(c.getOriginCity())
                .toCity(c.getDestinationCity())
                .distanceKm(c.getDistanceKm())
                .crossingCount(c.getCrossings().size())
                .missingCount(missingCount)
                .build();
    }

    /** One corridor's rows of a version: its own lines and the every-corridor lines, group then code order. */
    public static RateCorridorView toCorridorView(CatalogRows rows, Corridor corridor, List<MissingRate> missing) {
        UUID corridorId = corridor.getId();
        boolean ownBreaks = rows.hasOwnBreaks(corridorId);
        return RateCorridorView.builder()
                .versionId(rows.version().getId())
                .versionNo(rows.version().getVersionNo())
                .status(rows.version().getStatus())
                .corridor(toCorridorResponse(corridor, missing.size()))
                .serviceClasses(rows.classes().stream()
                        .filter(c -> c.getCorridor().getId().equals(corridorId))
                        .sorted(Comparator.comparing(RateServiceClass::getServiceClass))
                        .map(RateMapper::toClassResponse)
                        .toList())
                .lines(rows.lines().stream()
                        .filter(l -> l.getCorridor() == null
                                || l.getCorridor().getId().equals(corridorId))
                        .sorted(Comparator.comparing(RateLine::getGroupCode)
                                .thenComparing(RateLine::getCode)
                                .thenComparing(l -> l.getCorridor() == null))
                        .map(RateMapper::toLineResponse)
                        .toList())
                .volumeBreaks(rows.breaks().stream()
                        .filter(b -> ownBreaks
                                ? b.getCorridor() != null
                                        && b.getCorridor().getId().equals(corridorId)
                                : b.getCorridor() == null)
                        .sorted(Comparator.comparing(RateVolumeBreak::getMinHorses))
                        .map(RateMapper::toBreakResponse)
                        .toList())
                .volumeBreaksScope(ownBreaks ? "CORRIDOR" : "GLOBAL")
                .policies(rows.policyMap())
                .feeBands(rows.feeBands().stream()
                        .map(RateMapper::toFeeBandResponse)
                        .toList())
                .missing(missing.stream().map(RateMapper::toMissingResponse).toList())
                .build();
    }

    public static ServiceClassResponse toClassResponse(RateServiceClass c) {
        return ServiceClassResponse.builder()
                .serviceClass(c.getServiceClass())
                .widthPerHorseIn(c.getWidthPerHorseIn())
                .horsesPerPosition(c.getHorsesPerPosition())
                .positionRate(c.getPositionRate())
                .perHorse(c.getPositionRate()
                        .divide(BigDecimal.valueOf(c.getHorsesPerPosition()), 2, RoundingMode.HALF_UP))
                .build();
    }

    public static RateLineResponse toLineResponse(RateLine l) {
        return RateLineResponse.builder()
                .id(l.getId())
                .code(l.getCode())
                .group(l.getGroupCode())
                .description(l.getDescription())
                .basis(l.getBasis())
                .appliesToSex(l.getAppliesToSex())
                .appliesToTrailer(l.getAppliesToTrailer())
                .rate(l.getRate())
                .minCharge(l.getMinCharge())
                .defaultQuantity(l.getDefaultQuantity())
                .certainty(l.getCertainty())
                .estimateNote(l.getEstimateNote())
                .everyCorridor(l.getCorridor() == null)
                .build();
    }

    public static VolumeBreakResponse toBreakResponse(RateVolumeBreak b) {
        return new VolumeBreakResponse(b.getMinHorses(), b.getMaxHorses(), b.getDiscountPct());
    }

    public static FeeBandResponse toFeeBandResponse(RateFeeBand b) {
        return new FeeBandResponse(b.getKind(), b.getMinDays(), b.getMaxDays(), b.getValue());
    }

    public static MissingRateResponse toMissingResponse(MissingRate m) {
        return new MissingRateResponse(m.group(), m.description(), m.why());
    }

    private static String name(User user) {
        return user == null ? null : user.displayName();
    }
}
