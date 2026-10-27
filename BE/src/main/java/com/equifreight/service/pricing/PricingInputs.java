package com.equifreight.service.pricing;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.Place;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.repository.HorseSizeClassRepository;
import com.equifreight.repository.RegulationCatalogRepository;
import com.equifreight.repository.RegulationVersionRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Builds the engine's input from a stored request (spec §4.1). Cities and the destination country come from the
 * request's places, because a corridor may be used in reverse. Quarantine days are read from the destination's newest
 * published regulation version, which belongs to the regulation catalog (Flow 2) and is only read here.
 */
@Component
public class PricingInputs {

    private final RegulationCatalogRepository catalogs;
    private final RegulationVersionRepository versions;
    private final HorseSizeClassRepository sizeClasses;

    public PricingInputs(
            RegulationCatalogRepository catalogs,
            RegulationVersionRepository versions,
            HorseSizeClassRepository sizeClasses) {
        this.catalogs = catalogs;
        this.versions = versions;
        this.sizeClasses = sizeClasses;
    }

    /**
     * {@code weightsRequired}: true for a quotation being built or issued; false for the customer's estimate on a draft
     * and for re-totalling an accepted quotation on the final invoice (BR-Q-16).
     */
    public PricingInput inputFor(TransportRequest request, ServiceClass airClass, boolean weightsRequired) {
        return inputFor(request, airClass, weightsRequired, null);
    }

    /**
     * As above, with the request's domestic legs to and from hubs priced from {@code rows} (US-F1-09). Without rows,
     * or for a move a corridor joins, there are no legs.
     */
    public PricingInput inputFor(
            TransportRequest request, ServiceClass airClass, boolean weightsRequired, CatalogRows rows) {
        Corridor corridor = request.getCorridor();
        Place origin = request.getOriginPlace();
        Place destination = request.getDestinationPlace();
        Country destinationCountry = destination == null ? null : destination.getCountry();
        Map<String, Integer> widths = sizeClasses.findAll().stream()
                .collect(Collectors.toMap(HorseSizeClass::getCode, c -> (int) c.getWidthIn(), (a, b) -> a));
        List<PricingHorse> horses =
                request.getHorses().stream().map(rh -> horse(rh, widths::get)).toList();
        String fromCity = origin == null ? corridor.getOriginCity() : origin.getCity();
        String toCity = destination == null ? corridor.getDestinationCity() : destination.getCity();
        List<RoadLeg> legs = new ArrayList<>();
        Corridor first = request.getFirstLegCorridor();
        Corridor last = request.getLastLegCorridor();
        if (rows != null && first != null) {
            String hub = otherEnd(first, fromCity);
            legs.add(leg("A", first, fromCity, hub, rows));
            fromCity = hub;
        }
        if (rows != null && last != null) {
            String hub = otherEnd(last, toCity);
            legs.add(leg("G", last, hub, toCity, rows));
            toCity = hub;
        }
        return new PricingInput(
                corridor.getMode(),
                corridor.getCode(),
                fromCity,
                toCity,
                destinationCountry == null ? null : destinationCountry.getName(),
                corridor.getDistanceKm(),
                corridor.getCrossings().size(),
                airClass,
                request.getTrailer(),
                request.getInsurance(),
                request.isVetEscort(),
                quarantineDays(origin, destinationCountry),
                horses,
                request.getArrivalMode() == ArrivalMode.WINDOW,
                weightsRequired,
                legs);
    }

    private static RoadLeg leg(String group, Corridor leg, String from, String to, CatalogRows rows) {
        List<RateRow> freight = rows.forCorridor(leg.getId()).lines().stream()
                .filter(l -> l.basis() == RateBasis.PER_KM)
                .toList();
        return new RoadLeg(group, leg.getCode(), from, to, leg.getDistanceKm(), freight);
    }

    private static String otherEnd(Corridor c, String city) {
        return c.getOriginCity().equalsIgnoreCase(city) ? c.getDestinationCity() : c.getOriginCity();
    }

    /** A move within one country has no quarantine; otherwise the destination's published minimum, or null. */
    private Integer quarantineDays(Place origin, Country destination) {
        if (destination == null) {
            return null;
        }
        if (origin != null
                && origin.getCountry() != null
                && destination.getCode().equals(origin.getCountry().getCode())) {
            return 0;
        }
        return catalogs.findByCountryCode(destination.getCode())
                .flatMap(catalog ->
                        versions.findByCatalogIdAndStatusOrdered(catalog.getId(), CatalogStatus.PUBLISHED).stream()
                                .findFirst())
                .map(version -> (int) version.getQuarantineMinDays())
                .orElse(null);
    }

    private static PricingHorse horse(RequestHorse rh, Function<String, Integer> widthOf) {
        return new PricingHorse(
                rh.getHorse().getId(),
                rh.getHorse().getName(),
                rh.getSex(),
                rh.getSizeClassCode(),
                widthOf.apply(rh.getSizeClassCode()),
                rh.isWithFoal(),
                rh.getDeclaredValue(),
                rh.getWeightKg() == null ? null : rh.getWeightKg().intValue());
    }
}
