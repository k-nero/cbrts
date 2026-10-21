package com.equifreight.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Place;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.model.quotation.ManualLineRequest;
import com.equifreight.model.quotation.OverrideRequest;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.PricedLine;
import com.equifreight.service.pricing.PricingHorse;
import com.equifreight.service.pricing.PricingInput;
import com.equifreight.service.pricing.PricingInputs;
import com.equifreight.service.pricing.RateSetLoader;
import com.equifreight.service.quotation.Snapshots;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import tools.jackson.databind.json.JsonMapper;

/** The draft and issue services over one mocked request, rate catalog and repositories. */
abstract class QuotationServiceFixture {

    static final Instant NOW = Instant.parse("2026-10-19T04:00:00Z");

    TransportRequestRepository requests;
    QuotationRepository quotations;
    RateCatalogVersionRepository versions;
    RateSetLoader loader;
    PricingInputs inputs;
    CodeService codes;
    UserRepository users;
    AuditService audit;
    QuotationDraftService service;
    QuotationPricing pricing;
    Snapshots snapshots;

    User yen;
    TransportRequest request;
    Corridor corridor;
    RateCatalogVersion v2;
    RateCatalogVersion v3;
    List<PricingHorse> horses;
    Optional<Quotation> stored = Optional.empty();

    @BeforeEach
    void setUp() {
        requests = mock(TransportRequestRepository.class);
        quotations = mock(QuotationRepository.class);
        versions = mock(RateCatalogVersionRepository.class);
        loader = mock(RateSetLoader.class);
        inputs = mock(PricingInputs.class);
        codes = mock(CodeService.class);
        users = mock(UserRepository.class);
        audit = mock(AuditService.class);
        snapshots = new Snapshots(JsonMapper.builder().build());
        pricing = new QuotationPricing(loader, inputs, versions, users, quotations, snapshots);
        service = new QuotationDraftService(
                requests, quotations, versions, pricing, codes, audit, Clock.fixed(NOW, BusinessTime.ZONE));

        yen = new User();
        yen.setId(UUID.randomUUID());
        corridor = new Corridor();
        corridor.setId(UUID.randomUUID());
        corridor.setCode("AIR PNH → HKG");
        corridor.setMode(TransportMode.AIR);
        request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0199");
        request.setStatus(RequestStatus.SUBMITTED);
        request.setMode(TransportMode.AIR);
        request.setAirClass(ServiceClass.BUSINESS);
        request.setInsurance(InsuranceOption.EQUIFREIGHT);
        request.setCorridor(corridor);
        request.setDepartureDate(LocalDate.of(2026, 11, 20));
        Club club = new Club();
        club.setName("Saigon Turf Club");
        request.setClub(club);
        request.setOriginPlace(place("Phnom Penh"));
        request.setDestinationPlace(place("Hong Kong"));

        v2 = version(2);
        v3 = version(3);
        horses = new ArrayList<>(List.of(
                new PricingHorse(
                        UUID.randomUUID(), "Nightfall", HorseSex.MARE, "M", 32, false, new BigDecimal("175000")),
                new PricingHorse(
                        UUID.randomUUID(), "Shadowfax", HorseSex.GELDING, "M", 32, false, new BigDecimal("150000"))));

        when(requests.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));
        when(requests.findById(request.getId())).thenReturn(Optional.of(request));
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v2));
        when(loader.load(v2.getId())).thenReturn(rows(v2, true));
        when(loader.load(v3.getId())).thenReturn(rows(v3, true));
        when(inputs.inputFor(eq(request), any())).thenAnswer(i -> input(i.getArgument(1)));
        when(codes.next(CodePrefix.Q, 2026)).thenReturn("Q-2026-0189");
        when(quotations.findFirstByRequestIdOrderByVersionNoDesc(request.getId()))
                .thenAnswer(i -> stored);
        when(quotations.saveAndFlush(any())).thenAnswer(i -> {
            Quotation q = i.getArgument(0);
            if (q.getId() == null) {
                q.setId(UUID.randomUUID());
            }
            stored = Optional.of(q);
            return q;
        });
        when(quotations.save(any())).thenAnswer(i -> i.getArgument(0));
        User lan = new User();
        lan.setFirstName("Thị Lan");
        lan.setLastName("Nguyễn");
        when(users.findByRoleAndStatus("TRANSPORT_SPECIALIST", UserStatus.ACTIVE))
                .thenReturn(List.of(lan));
    }

    static Place place(String city) {
        Place p = new Place();
        p.setCity(city);
        return p;
    }

    static RateCatalogVersion version(int no) {
        RateCatalogVersion v = new RateCatalogVersion();
        v.setId(UUID.randomUUID());
        v.setVersionNo(no);
        v.setStatus(CatalogStatus.PUBLISHED);
        return v;
    }

    PricingInput input(ServiceClass airClass) {
        return new PricingInput(
                request.getMode(),
                "AIR PNH → HKG",
                "Phnom Penh",
                "Hong Kong",
                "Hong Kong",
                1550,
                0,
                airClass,
                request.getTrailer(),
                request.getInsurance(),
                false,
                0,
                List.copyOf(horses),
                request.getArrivalMode() == com.equifreight.entity.enums.ArrivalMode.WINDOW);
    }

    /** Business and first stall rows (business optional), a groom line, the four percentages. */
    CatalogRows rows(RateCatalogVersion v, boolean withBusiness) {
        List<RateServiceClass> stalls = new ArrayList<>();
        if (withBusiness) {
            stalls.add(stall(v, ServiceClass.BUSINESS, 48));
        }
        stalls.add(stall(v, ServiceClass.FIRST, 96));
        RateLine groom = new RateLine();
        groom.setId(UUID.randomUUID());
        groom.setVersion(v);
        groom.setCode("GROOM");
        groom.setGroupCode("D");
        groom.setDescription("Flying groom");
        groom.setBasis(RateBasis.PER_THREE_HORSES);
        groom.setRate(new BigDecimal("1450"));
        groom.setCertainty(RateCertainty.FIXED);
        List<RatePolicy> policies = new ArrayList<>();
        for (RatePolicyKey key : List.of(
                RatePolicyKey.FUEL_PCT,
                RatePolicyKey.INSURANCE_PCT,
                RatePolicyKey.CONTINGENCY_PCT,
                RatePolicyKey.SERVICE_FEE_PCT,
                RatePolicyKey.QUOTE_VALIDITY_DAYS,
                RatePolicyKey.DEPOSIT_PCT)) {
            RatePolicy p = new RatePolicy();
            p.setId(new RatePolicy.Key(v.getId(), key));
            p.setValue(
                    switch (key) {
                        case QUOTE_VALIDITY_DAYS -> new BigDecimal("7");
                        case DEPOSIT_PCT -> new BigDecimal("30");
                        default -> BigDecimal.TEN;
                    });
            policies.add(p);
        }
        return new CatalogRows(v, stalls, List.of(groom), List.of(), policies, List.of());
    }

    RateServiceClass stall(RateCatalogVersion v, ServiceClass sc, int width) {
        RateServiceClass s = new RateServiceClass();
        s.setId(UUID.randomUUID());
        s.setVersion(v);
        s.setCorridor(corridor);
        s.setServiceClass(sc);
        s.setWidthPerHorseIn((short) width);
        s.setHorsesPerPosition((short) (96 / width));
        s.setPositionRate(new BigDecimal("16800"));
        return s;
    }

    Quotation issued() {
        Quotation q = new Quotation();
        q.setId(UUID.randomUUID());
        q.setCode("Q-2026-0189");
        q.setVersionNo((short) 1);
        q.setStatus(QuotationStatus.ISSUED);
        q.setRequest(request);
        q.setRateCatalogVersion(v2);
        q.setCurrency("USD");
        q.setAirClass(ServiceClass.BUSINESS);
        return q;
    }

    /** A private road move: a per-km road line, a groom and the window surcharge policy. */
    CatalogRows roadWindowRows(RateCatalogVersion v) {
        CatalogRows base = rows(v, true);
        RateLine road = new RateLine();
        road.setId(UUID.randomUUID());
        road.setVersion(v);
        road.setCode("ROAD");
        road.setGroupCode("C");
        road.setDescription("Road freight");
        road.setBasis(RateBasis.PER_KM);
        road.setRate(new BigDecimal("3.60"));
        road.setCertainty(RateCertainty.FIXED);
        List<RatePolicy> policies = new ArrayList<>(base.policies());
        RatePolicy window = new RatePolicy();
        window.setId(new RatePolicy.Key(v.getId(), RatePolicyKey.ARRIVAL_WINDOW_PCT));
        window.setValue(new BigDecimal("20"));
        policies.add(window);
        List<RateLine> lines = new ArrayList<>(base.lines());
        lines.add(road);
        return new CatalogRows(v, List.of(), lines, List.of(), policies, List.of());
    }

    QuotationLine lineKeyed(String key) {
        return stored.orElseThrow().getLines().stream()
                .filter(l -> key.equals(l.getLineKey()))
                .findFirst()
                .orElseThrow();
    }

    void overrideGroom(String amount) {
        QuotationLine groom = lineKeyed("GROOM");
        groom.setOverrideAmount(new BigDecimal(amount));
        groom.setOverrideReason("Groom from the club's own staff");
    }

    QuotationLine manualLine(String group, String description, String amount) {
        QuotationLine line = new QuotationLine();
        line.setQuotation(stored.orElseThrow());
        line.setGroupCode(group);
        line.setPosition((short) 9);
        line.setLineKey("MANUAL:" + UUID.randomUUID());
        line.setDescription(description);
        line.setBasis(RateBasis.PER_SHIPMENT);
        line.setBasisText("added by Vũ Thị Yến");
        line.setQuantity(BigDecimal.ONE);
        line.setUnitRate(new BigDecimal(amount));
        line.setCatalogAmount(new BigDecimal(amount));
        line.setSource(LineSource.MANUAL);
        line.setCertainty(LineCertainty.FIXED);
        line.setManualReason("Ferry booking the catalog doesn't know");
        return line;
    }

    CatalogRows rowsWithGroom(RateCatalogVersion v, String groomRate) {
        CatalogRows base = rows(v, true);
        base.lines().getFirst().setRate(new BigDecimal(groomRate));
        return base;
    }

    /** Starts the draft and gives its lines ids, as the database would. */
    Quotation startedWithIds() {
        yen.setFirstName("Thị Yến");
        yen.setLastName("Vũ");
        service.start(yen, request.getId());
        Quotation q = stored.orElseThrow();
        q.getLines().forEach(l -> l.setId(UUID.randomUUID()));
        request.setStatus(RequestStatus.UNDER_REVIEW);
        return q;
    }

    static PricedLine withAmount(PricedLine l, BigDecimal amount) {
        return new PricedLine(
                l.group(),
                l.lineKey(),
                l.description(),
                l.basis(),
                l.basisText(),
                l.quantity(),
                l.unitRate(),
                amount,
                l.source(),
                l.rateLineId(),
                l.rateServiceClassId(),
                l.horseId(),
                l.certainty(),
                l.estimateNote());
    }

    static OverrideRequest override(String amount) {
        return new OverrideRequest(new BigDecimal(amount), "Groom from the club's own staff");
    }

    static ManualLineRequest ferry(String unitRate, RateCertainty certainty, String note) {
        return new ManualLineRequest(
                "H",
                "Ferry booking fee",
                new BigDecimal("2"),
                new BigDecimal(unitRate),
                certainty,
                note,
                "Ferry booking the catalog doesn't know");
    }
}
