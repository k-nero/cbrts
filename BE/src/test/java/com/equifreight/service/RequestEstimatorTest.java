package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.Horse;
import com.equifreight.entity.Place;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.EstimateResult;
import com.equifreight.service.pricing.EstimateStatus;
import com.equifreight.service.pricing.PricingHorse;
import com.equifreight.service.pricing.PricingInput;
import com.equifreight.service.pricing.PricingInputs;
import com.equifreight.service.pricing.RateSetLoader;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** US-Q-05: the customer's estimate for an unsaved request, with stated assumptions and each option's effect. */
class RequestEstimatorTest {

    RateCatalogVersionRepository versions;
    RateSetLoader loader;
    PricingInputs inputs;
    RouteService routes;
    RequestEstimator estimator;

    RateCatalogVersion v5;
    Corridor air;
    Corridor road;
    Place phnomPenh;
    Place hongKong;
    List<RateServiceClass> classes;
    List<RateLine> lines;
    List<RatePolicy> policies;

    @BeforeEach
    void setUp() {
        versions = mock(RateCatalogVersionRepository.class);
        loader = mock(RateSetLoader.class);
        inputs = mock(PricingInputs.class);
        routes = mock(RouteService.class);
        estimator = new RequestEstimator(versions, loader, inputs, routes);

        v5 = new RateCatalogVersion();
        v5.setId(UUID.randomUUID());
        v5.setVersionNo(5);
        v5.setStatus(CatalogStatus.PUBLISHED);
        air = corridor("AIR PNH → HKG", TransportMode.AIR, 1550);
        road = corridor("RD PNH → HKG", TransportMode.ROAD, 900);
        phnomPenh = new Place();
        phnomPenh.setCity("Phnom Penh");
        hongKong = new Place();
        hongKong.setCity("Hong Kong");

        classes = new ArrayList<>(List.of(stall(ServiceClass.BUSINESS, 48), stall(ServiceClass.FIRST, 96)));
        lines = new ArrayList<>(List.of(
                line(null, "GROOM", "D", RateBasis.PER_THREE_HORSES, "1450", null),
                line(road, "ROAD_SHARED", "C", RateBasis.PER_KM, "2.40", TrailerType.SHARED),
                line(road, "ROAD_PRIVATE", "C", RateBasis.PER_KM, "3.60", TrailerType.PRIVATE)));
        policies = new ArrayList<>();
        policy(RatePolicyKey.FUEL_PCT, "18");
        policy(RatePolicyKey.INSURANCE_PCT, "1.5");
        policy(RatePolicyKey.CONTINGENCY_PCT, "5");
        policy(RatePolicyKey.SERVICE_FEE_PCT, "12");
        policy(RatePolicyKey.ARRIVAL_WINDOW_PCT, "20");
        policy(RatePolicyKey.ESTIMATE_BAND_PCT, "15");

        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v5));
        when(loader.load(v5)).thenAnswer(i -> new CatalogRows(v5, classes, lines, List.of(), policies, List.of()));
        when(inputs.inputFor(any(), any())).thenAnswer(i -> input(i.getArgument(0), i.getArgument(1)));
        when(routes.resolve(any(), any(), any(), any(), eq(TransportMode.AIR))).thenReturn(resolution(air, Set.of()));
        when(routes.resolve(any(), any(), any(), any(), eq(TransportMode.ROAD))).thenReturn(resolution(road, Set.of()));
    }

    static Corridor corridor(String code, TransportMode mode, int km) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(mode);
        c.setDistanceKm(km);
        return c;
    }

    RateServiceClass stall(ServiceClass sc, int width) {
        RateServiceClass s = new RateServiceClass();
        s.setId(UUID.randomUUID());
        s.setCorridor(air);
        s.setServiceClass(sc);
        s.setWidthPerHorseIn((short) width);
        s.setHorsesPerPosition((short) (96 / width));
        s.setPositionRate(new BigDecimal("16800"));
        return s;
    }

    static RateLine line(Corridor corridor, String code, String group, RateBasis basis, String rate, TrailerType t) {
        RateLine l = new RateLine();
        l.setId(UUID.randomUUID());
        l.setCorridor(corridor);
        l.setCode(code);
        l.setGroupCode(group);
        l.setDescription(code);
        l.setBasis(basis);
        l.setRate(new BigDecimal(rate));
        l.setAppliesToTrailer(t);
        l.setCertainty(RateCertainty.FIXED);
        return l;
    }

    void policy(RatePolicyKey key, String value) {
        RatePolicy p = new RatePolicy();
        p.setId(new RatePolicy.Key(v5.getId(), key));
        p.setValue(new BigDecimal(value));
        policies.add(p);
    }

    static RouteResolution resolution(Corridor corridor, Set<TransportMode> modesRun) {
        Set<TransportMode> run = modesRun.isEmpty() ? EnumSet.of(corridor.getMode()) : modesRun;
        return new RouteResolution(corridor, null, run, null, false, false);
    }

    /** Two medium horses; the input follows the request's corridor and service fields as PricingInputs does. */
    static PricingInput input(TransportRequest r, ServiceClass airClass) {
        Corridor c = r.getCorridor();
        List<PricingHorse> horses = r.getHorses().stream()
                .map(rh -> new PricingHorse(
                        rh.getHorse().getId(),
                        rh.getHorse().getName(),
                        rh.getSex(),
                        "M",
                        32,
                        false,
                        rh.getDeclaredValue()))
                .toList();
        return new PricingInput(
                c.getMode(),
                c.getCode(),
                "Phnom Penh",
                "Hong Kong",
                "Hong Kong",
                c.getDistanceKm(),
                0,
                airClass,
                r.getTrailer(),
                r.getInsurance(),
                false,
                0,
                horses,
                r.getArrivalMode() == ArrivalMode.WINDOW);
    }

    TransportRequest request(Corridor corridor) {
        TransportRequest r = new TransportRequest();
        r.setOriginPlace(phnomPenh);
        r.setDestinationPlace(hongKong);
        r.setCorridor(corridor);
        for (String name : List.of("Nightfall", "Shadowfax")) {
            Horse h = new Horse();
            h.setId(UUID.randomUUID());
            h.setName(name);
            RequestHorse rh = new RequestHorse();
            rh.setHorse(h);
            rh.setSex(HorseSex.MARE);
            rh.setDeclaredValue(new BigDecimal("100000"));
            r.getHorses().add(rh);
        }
        return r;
    }

    static RequestEstimator.Option option(RequestEstimator.View view, String group, String value) {
        return view.options().get(group).stream()
                .filter(o -> o.value().equals(value))
                .findFirst()
                .orElseThrow();
    }

    // --- assumptions ------------------------------------------------------------------------------------

    @Test
    void unsetFieldsTakeStatedAssumptions() {
        RequestEstimator.View view = estimator.estimate(request(air), resolution(air, Set.of()));

        assertThat(view.assumptions())
                .containsExactly(
                        "Assumes air until you choose a service on step 3.",
                        "Assumes business class until you choose a class on step 3.",
                        "Assumes EquiFreight transit cover until you choose on step 3.");
        assertThat(view.result().status()).isEqualTo(EstimateStatus.READY);
        assertThat(view.result().low()).isLessThan(view.result().high());
        assertThat(view.versionNo()).isEqualTo(5);
    }

    @Test
    void aRouteRunBothWaysAssumesRoadAndPricesAirThroughItsCorridor() {
        RequestEstimator.View view = estimator.estimate(
                request(null),
                new RouteResolution(null, null, EnumSet.of(TransportMode.ROAD, TransportMode.AIR), null, false, false));

        assertThat(view.assumptions())
                .startsWith(
                        "Assumes road until you choose a service on step 3.",
                        "Assumes a shared load until you choose a trailer on step 3.");
        assertThat(view.result().status()).isEqualTo(EstimateStatus.READY);
        assertThat(option(view, "mode", "ROAD").current()).isTrue();
        RequestEstimator.Option byAir = option(view, "mode", "AIR");
        assertThat(byAir.current()).isFalse();
        assertThat(byAir.deltaLow()).isNotNull();
        assertThat(byAir.deltaHigh()).isNotNull();
        assertThat(byAir.unavailable()).isNull();
    }

    // --- options ------------------------------------------------------------------------------------------

    @Test
    void theChosenOptionIsCurrentAndTheOthersCarrySignedDeltas() {
        TransportRequest business = request(air);
        business.setMode(TransportMode.AIR);
        business.setAirClass(ServiceClass.BUSINESS);
        business.setInsurance(InsuranceOption.EQUIFREIGHT);
        TransportRequest first = request(air);
        first.setMode(TransportMode.AIR);
        first.setAirClass(ServiceClass.FIRST);
        first.setInsurance(InsuranceOption.EQUIFREIGHT);
        EstimateResult firstRange =
                estimator.estimate(first, resolution(air, Set.of())).result();

        RequestEstimator.View view = estimator.estimate(business, resolution(air, Set.of()));

        assertThat(option(view, "airClass", "BUSINESS").current()).isTrue();
        RequestEstimator.Option firstClass = option(view, "airClass", "FIRST");
        assertThat(firstClass.deltaLow())
                .isEqualByComparingTo(firstRange.low().subtract(view.result().low()));
        assertThat(firstClass.deltaHigh())
                .isEqualByComparingTo(firstRange.high().subtract(view.result().high()));
        assertThat(firstClass.deltaLow().signum()).isPositive();
        assertThat(view.options().get("trailer")).isEmpty();
        assertThat(view.options().get("arrivalWindow")).isEmpty();
    }

    @Test
    void anOptionTheCatalogCantPriceIsUnavailable() {
        RequestEstimator.View view = estimator.estimate(request(air), resolution(air, Set.of()));

        assertThat(option(view, "airClass", "ECONOMY").unavailable())
                .isEqualTo("No estimate yet: Rate catalog v5 has no economy stall rate for AIR PNH → HKG.");
    }

    @Test
    void aModeWeDontRunIsUnavailable() {
        RequestEstimator.View view = estimator.estimate(request(air), resolution(air, Set.of()));

        assertThat(option(view, "mode", "ROAD").unavailable()).isEqualTo("We don't run this route by road.");
        assertThat(option(view, "mode", "AIR").current()).isTrue();
    }

    @Test
    void insuranceShowsTheExactCover() {
        TransportRequest withCover = request(air);
        withCover.setInsurance(InsuranceOption.EQUIFREIGHT);
        RequestEstimator.View covered = estimator.estimate(withCover, resolution(air, Set.of()));
        // 1.5% of $200,000 declared value.
        RequestEstimator.Option own = option(covered, "insurance", "OWN_POLICY");
        assertThat(own.exact()).isEqualByComparingTo("-3000.00");
        assertThat(own.deltaLow()).isNull();
        assertThat(own.deltaHigh()).isNull();
        assertThat(option(covered, "insurance", "EQUIFREIGHT").current()).isTrue();

        TransportRequest ownPolicy = request(air);
        ownPolicy.setInsurance(InsuranceOption.OWN_POLICY);
        RequestEstimator.View uncovered = estimator.estimate(ownPolicy, resolution(air, Set.of()));
        assertThat(option(uncovered, "insurance", "EQUIFREIGHT").exact()).isEqualByComparingTo("3000.00");
    }

    @Test
    void theWindowIsPricedWithAPrivateTrailer() {
        TransportRequest shared = request(road);
        shared.setMode(TransportMode.ROAD);
        shared.setTrailer(TrailerType.SHARED);
        shared.setInsurance(InsuranceOption.OWN_POLICY);
        TransportRequest privateWindow = request(road);
        privateWindow.setMode(TransportMode.ROAD);
        privateWindow.setTrailer(TrailerType.PRIVATE);
        privateWindow.setInsurance(InsuranceOption.OWN_POLICY);
        privateWindow.setArrivalMode(ArrivalMode.WINDOW);
        EstimateResult windowRange =
                estimator.estimate(privateWindow, resolution(road, Set.of())).result();

        RequestEstimator.View view = estimator.estimate(shared, resolution(road, Set.of()));

        assertThat(option(view, "arrivalWindow", "false").current()).isTrue();
        RequestEstimator.Option window = option(view, "arrivalWindow", "true");
        assertThat(window.deltaLow())
                .isEqualByComparingTo(windowRange.low().subtract(view.result().low()));
        assertThat(window.deltaHigh())
                .isEqualByComparingTo(windowRange.high().subtract(view.result().high()));
        assertThat(option(view, "trailer", "SHARED").current()).isTrue();
        assertThat(view.options().get("airClass")).isEmpty();
    }

    @Test
    void noDeltasWhenTheCurrentEstimateIsUnavailable() {
        classes.removeIf(c -> c.getServiceClass() == ServiceClass.BUSINESS);

        RequestEstimator.View view = estimator.estimate(request(air), resolution(air, Set.of()));

        assertThat(view.result().status()).isEqualTo(EstimateStatus.UNAVAILABLE);
        assertThat(view.options().values().stream().flatMap(List::stream))
                .isNotEmpty()
                .allSatisfy(o -> {
                    assertThat(o.deltaLow()).isNull();
                    assertThat(o.deltaHigh()).isNull();
                    assertThat(o.exact()).isNull();
                    assertThat(o.unavailable()).isNull();
                });
    }

    @Test
    void noPublishedCatalog() {
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        RequestEstimator.View view = estimator.estimate(request(air), resolution(air, Set.of()));

        assertThat(view.result().status()).isEqualTo(EstimateStatus.UNAVAILABLE);
        assertThat(view.result().message()).isEqualTo("No estimate yet: no rate catalog is published.");
        assertThat(view.options().values()).allSatisfy(list -> assertThat(list).isEmpty());
    }

    @Test
    void rangeForASubmittedRequestUsesItsOwnFields() {
        TransportRequest submitted = request(air);
        submitted.setMode(TransportMode.AIR);
        submitted.setAirClass(ServiceClass.FIRST);
        submitted.setInsurance(InsuranceOption.OWN_POLICY);
        TransportRequest same = request(air);
        same.setMode(TransportMode.AIR);
        same.setAirClass(ServiceClass.FIRST);
        same.setInsurance(InsuranceOption.OWN_POLICY);

        EstimateResult range = estimator.rangeFor(submitted);

        assertThat(range)
                .isEqualTo(estimator.estimate(same, resolution(air, Set.of())).result());
        assertThat(range.status()).isEqualTo(EstimateStatus.READY);
    }

    @Test
    void theEstimatorReadsOnlyThePublishedVersion() {
        estimator.estimate(request(air), resolution(air, Set.of()));

        org.mockito.Mockito.verify(versions, org.mockito.Mockito.atLeastOnce())
                .findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED);
        verifyNoMoreInteractions(versions);
    }
}
