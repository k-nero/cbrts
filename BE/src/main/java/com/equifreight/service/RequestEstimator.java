package com.equifreight.service;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.EstimateBand;
import com.equifreight.service.pricing.EstimateResult;
import com.equifreight.service.pricing.EstimateStatus;
import com.equifreight.service.pricing.PricedQuote;
import com.equifreight.service.pricing.PricingInputs;
import com.equifreight.service.pricing.QuotePricer;
import com.equifreight.service.pricing.RateSet;
import com.equifreight.service.pricing.RateSetLoader;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import org.springframework.stereotype.Service;

/**
 * The customer's instant estimate (US-Q-05, BR-Q-10/11): prices a request that is never saved on the published
 * catalog, fills what the customer hasn't chosen yet with stated assumptions, and prices each other choice so the
 * wizard can show its effect. It reads only; nothing it builds is handed to a repository.
 */
@Service
public class RequestEstimator {

    static final String NO_CATALOG = "No estimate yet: no rate catalog is published.";

    /** One choice on the wizard: the current one, or its effect on the range, or why it can't be priced. */
    public record Option(
            String value,
            boolean current,
            BigDecimal deltaLow,
            BigDecimal deltaHigh,
            BigDecimal exact,
            String unavailable) {

        static Option current(String value) {
            return new Option(value, true, null, null, null, null);
        }

        static Option silent(String value) {
            return new Option(value, false, null, null, null, null);
        }
    }

    /** The estimate, what it assumed, the catalog version read, and the options by group. */
    public record View(
            EstimateResult result, List<String> assumptions, Integer versionNo, Map<String, List<Option>> options) {}

    private record Priced(EstimateResult result, PricedQuote quote) {}

    private final RateCatalogVersionRepository versions;
    private final RateSetLoader loader;
    private final PricingInputs inputs;
    private final RouteService routes;

    public RequestEstimator(
            RateCatalogVersionRepository versions, RateSetLoader loader, PricingInputs inputs, RouteService routes) {
        this.versions = versions;
        this.loader = loader;
        this.inputs = inputs;
        this.routes = routes;
    }

    /** An unsaved request whose route is resolved; its unset service fields are filled with the assumptions. */
    public View estimate(TransportRequest request, RouteResolution resolution) {
        List<String> assumptions = new ArrayList<>();
        if (request.getMode() == null) {
            TransportMode mode = resolution.modesRun().contains(TransportMode.ROAD)
                    ? TransportMode.ROAD
                    : resolution.modesRun().iterator().next();
            request.setMode(mode);
            if (request.getCorridor() == null || request.getCorridor().getMode() != mode) {
                request.setCorridor(corridorFor(request, mode));
            }
            assumptions.add("Assumes " + modeWord(mode) + " until you choose a service on step 3.");
        }
        if (request.getMode() == TransportMode.ROAD && request.getTrailer() == null) {
            request.setTrailer(TrailerType.SHARED);
            assumptions.add("Assumes a shared load until you choose a trailer on step 3.");
        }
        if (request.getMode() == TransportMode.AIR && request.getAirClass() == null) {
            request.setAirClass(ServiceClass.BUSINESS);
            assumptions.add("Assumes business class until you choose a class on step 3.");
        }
        if (request.getInsurance() == null) {
            request.setInsurance(InsuranceOption.EQUIFREIGHT);
            assumptions.add("Assumes EquiFreight transit cover until you choose on step 3.");
        }

        Optional<RateCatalogVersion> published =
                versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED);
        if (published.isEmpty()) {
            return new View(
                    EstimateResult.unavailable(EstimateStatus.UNAVAILABLE, NO_CATALOG), assumptions, null, noOptions());
        }
        CatalogRows rows = loader.load(published.get());
        Priced current = price(request, rows);
        return new View(
                current.result(),
                assumptions,
                published.get().getVersionNo(),
                options(request, resolution, rows, current));
    }

    /** A submitted request, priced on its own fields (spec §5.2). */
    public EstimateResult rangeFor(TransportRequest request) {
        return versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED)
                .map(v -> price(request, loader.load(v)).result())
                .orElseGet(() -> EstimateResult.unavailable(EstimateStatus.UNAVAILABLE, NO_CATALOG));
    }

    // --- pricing ----------------------------------------------------------------------------------------

    private Priced price(TransportRequest r, CatalogRows rows) {
        if (r.getCorridor() == null) {
            return new Priced(EstimateResult.unavailable(EstimateStatus.UNAVAILABLE, notRunBy(r.getMode())), null);
        }
        RateSet rates = rows.forCorridor(r.getCorridor().getId());
        ServiceClass airClass = r.getMode() == TransportMode.AIR ? r.getAirClass() : null;
        PricedQuote quote = QuotePricer.price(inputs.inputFor(r, airClass), rates);
        return new Priced(EstimateBand.of(quote, rates), quote);
    }

    private Map<String, List<Option>> options(
            TransportRequest base, RouteResolution resolution, CatalogRows rows, Priced current) {
        Map<String, List<Option>> options = noOptions();
        boolean live = current.result().status() == EstimateStatus.READY;

        for (TransportMode mode : TransportMode.values()) {
            String value = mode.name();
            if (mode == base.getMode()) {
                options.get("mode").add(Option.current(value));
            } else if (!live) {
                options.get("mode").add(Option.silent(value));
            } else if (!resolution.modesRun().contains(mode)) {
                options.get("mode").add(new Option(value, false, null, null, null, notRunBy(mode)));
            } else {
                options.get("mode").add(effect(value, current, rows, variant(base, v -> {
                    v.setMode(mode);
                    v.setCorridor(corridorFor(base, mode));
                    v.setTrailer(mode == TransportMode.ROAD ? TrailerType.SHARED : null);
                    v.setAirClass(mode == TransportMode.AIR ? ServiceClass.BUSINESS : null);
                    v.setArrivalMode(ArrivalMode.ANY_TIME);
                })));
            }
        }
        if (base.getMode() == TransportMode.ROAD) {
            for (TrailerType trailer : TrailerType.values()) {
                options.get("trailer")
                        .add(choice(
                                trailer.name(),
                                trailer == base.getTrailer(),
                                live,
                                current,
                                rows,
                                () -> variant(base, v -> {
                                    v.setTrailer(trailer);
                                    if (trailer == TrailerType.SHARED) {
                                        v.setArrivalMode(ArrivalMode.ANY_TIME);
                                    }
                                })));
            }
            boolean window = base.getArrivalMode() == ArrivalMode.WINDOW;
            options.get("arrivalWindow")
                    .add(choice(
                            "false",
                            !window,
                            live,
                            current,
                            rows,
                            () -> variant(base, v -> v.setArrivalMode(ArrivalMode.ANY_TIME))));
            options.get("arrivalWindow")
                    .add(choice(
                            "true",
                            window,
                            live,
                            current,
                            rows,
                            () -> variant(base, v -> {
                                v.setTrailer(TrailerType.PRIVATE);
                                v.setArrivalMode(ArrivalMode.WINDOW);
                            })));
        }
        if (base.getMode() == TransportMode.AIR) {
            for (ServiceClass airClass : ServiceClass.values()) {
                options.get("airClass")
                        .add(choice(
                                airClass.name(),
                                airClass == base.getAirClass(),
                                live,
                                current,
                                rows,
                                () -> variant(base, v -> v.setAirClass(airClass))));
            }
        }
        for (InsuranceOption insurance : InsuranceOption.values()) {
            options.get("insurance").add(insuranceOption(base, insurance, live, current, rows));
        }
        return options;
    }

    private Option choice(
            String value,
            boolean isCurrent,
            boolean live,
            Priced current,
            CatalogRows rows,
            java.util.function.Supplier<TransportRequest> variant) {
        if (isCurrent) {
            return Option.current(value);
        }
        if (!live) {
            return Option.silent(value);
        }
        return effect(value, current, rows, variant.get());
    }

    private Option effect(String value, Priced current, CatalogRows rows, TransportRequest variant) {
        EstimateResult alt = price(variant, rows).result();
        if (alt.status() != EstimateStatus.READY) {
            return new Option(value, false, null, null, null, alt.message());
        }
        return new Option(
                value,
                false,
                alt.low().subtract(current.result().low()),
                alt.high().subtract(current.result().high()),
                null,
                null);
    }

    /** Insurance is a percentage of declared value, so its effect is an exact figure (DESIGN.md, Service step). */
    private Option insuranceOption(
            TransportRequest base, InsuranceOption insurance, boolean live, Priced current, CatalogRows rows) {
        String value = insurance.name();
        if (insurance == base.getInsurance()) {
            return Option.current(value);
        }
        if (!live) {
            return Option.silent(value);
        }
        Priced covered = insurance == InsuranceOption.EQUIFREIGHT
                ? price(variant(base, v -> v.setInsurance(InsuranceOption.EQUIFREIGHT)), rows)
                : current;
        BigDecimal cover =
                covered.quote() == null ? null : covered.quote().totals().insurance();
        if (cover == null) {
            return new Option(value, false, null, null, null, covered.result().message());
        }
        return new Option(
                value, false, null, null, insurance == InsuranceOption.EQUIFREIGHT ? cover : cover.negate(), null);
    }

    // --- helpers ------------------------------------------------------------------------------------------

    private Corridor corridorFor(TransportRequest request, TransportMode mode) {
        return routes.resolve(
                        request.getOriginPlace(),
                        request.getOriginText(),
                        request.getDestinationPlace(),
                        request.getDestinationText(),
                        mode)
                .corridor();
    }

    /** A copy of the request's priced fields, changed for one alternative; never saved. */
    private static TransportRequest variant(TransportRequest base, Consumer<TransportRequest> change) {
        TransportRequest v = new TransportRequest();
        v.setOriginPlace(base.getOriginPlace());
        v.setOriginText(base.getOriginText());
        v.setDestinationPlace(base.getDestinationPlace());
        v.setDestinationText(base.getDestinationText());
        v.setCorridor(base.getCorridor());
        v.setMode(base.getMode());
        v.setTrailer(base.getTrailer());
        v.setAirClass(base.getAirClass());
        v.setInsurance(base.getInsurance());
        v.setVetEscort(base.isVetEscort());
        v.setArrivalMode(base.getArrivalMode());
        v.getHorses().addAll(base.getHorses());
        change.accept(v);
        return v;
    }

    private static Map<String, List<Option>> noOptions() {
        Map<String, List<Option>> options = new LinkedHashMap<>();
        for (String group : List.of("mode", "trailer", "airClass", "insurance", "arrivalWindow")) {
            options.put(group, new ArrayList<>());
        }
        return options;
    }

    private static String modeWord(TransportMode mode) {
        return mode == TransportMode.AIR ? "air" : "road";
    }

    private static String notRunBy(TransportMode mode) {
        return "We don't run this route by " + modeWord(mode) + ".";
    }
}
