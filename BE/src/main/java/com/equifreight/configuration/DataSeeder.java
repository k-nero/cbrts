package com.equifreight.configuration;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.repository.*;
import com.equifreight.service.HorseSizing;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lombok.extern.log4j.Log4j2;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds roles, demo accounts, vehicles, places, corridors, horses, and canonical jobs for CBRTS.
 * The customer's club and its four horses come first (docs/figma-plugin/src/03-pages.js, HORSES), with
 * their full passport identity, so the demo jobs reuse them by name. Every value is a demo placeholder.
 * Idempotent: existing records are preserved.
 */
@Component
@Log4j2
public class DataSeeder implements ApplicationRunner {

    private static final String[][] ROLES = {
        {RoleName.CUSTOMER, "Racing club or horse owner"},
        {RoleName.LOGISTICS_MANAGER, "Reviews requests, issues quotations, owns escalations"},
        {RoleName.TRANSPORT_SPECIALIST, "Checks documents, files with authorities, keeps the catalogs"},
        {RoleName.FLEET_COORDINATOR, "Plans routes, vehicles and stall positions"},
        {RoleName.ESCORT, "Driver or groom on the trip"}
    };

    /**
     * email, first name, last name, role
     */
    private static final String[][] USERS = {
        {"bookings@saigonturf.vn", "Saigon Turf", "Club", RoleName.CUSTOMER},
        {"yen.vu@equifreight.vn", "Hải Yến", "Vũ", RoleName.LOGISTICS_MANAGER},
        {"lan.nguyen@equifreight.vn", "Thị Lan", "Nguyễn", RoleName.TRANSPORT_SPECIALIST},
        {"khoi.do@equifreight.vn", "Minh Khôi", "Đỗ", RoleName.FLEET_COORDINATOR},
        {"minh.tran@equifreight.vn", "Văn Minh", "Trần", RoleName.ESCORT},
        {"hoa.le@equifreight.vn", "Thị Hoa", "Lê", RoleName.ESCORT},
        {"tuan.pham@equifreight.vn", "Quốc Tuấn", "Phạm", RoleName.ESCORT}
    };

    private static final String CLUB_NAME = "Saigon Turf Club";
    private static final String CLUB_EMAIL = "bookings@saigonturf.vn";
    private static final List<DemoHorse> HORSES = List.of(
            new DemoHorse(
                    "Shadowfax",
                    HorseCoat.GREY,
                    "Andalusian",
                    HorseSex.GELDING,
                    LocalDate.of(2019, 5, 10),
                    "16.2",
                    510,
                    StallType.STANDARD,
                    Temperament.CALM,
                    "85000",
                    "250259600123456",
                    "VN-PP-2019-0412",
                    "Annual vaccinations up to date. No known allergies. Loads best in a quiet yard."),
            new DemoHorse(
                    "Nightfall",
                    HorseCoat.BLACK,
                    "Thoroughbred",
                    HorseSex.MARE,
                    LocalDate.of(2022, 4, 14),
                    "16.0",
                    478,
                    StallType.CLIMATE,
                    Temperament.NERVOUS,
                    "240000",
                    "250259600223311",
                    "VN-PP-2022-0188",
                    "Sensitive to loud noise. Needs a slow, gentle load and a climate-controlled stall."),
            new DemoHorse(
                    "Copper King",
                    HorseCoat.CHESTNUT,
                    "Quarter Horse",
                    HorseSex.STALLION,
                    LocalDate.of(2017, 2, 20),
                    "15.3",
                    583,
                    StallType.BOX,
                    Temperament.AGGRESSIVE,
                    "120000",
                    "985141000876502",
                    "VN-PP-2017-0093",
                    "Box stall only. Never next to a mare. Experienced handlers only."),
            new DemoHorse(
                    "Silver Bell",
                    HorseCoat.GREY,
                    "Lipizzan",
                    HorseSex.MARE,
                    LocalDate.of(2020, 6, 8),
                    "15.1",
                    445,
                    StallType.STANDARD,
                    Temperament.CALM,
                    "60000",
                    "203098100554120",
                    "VN-PP-2020-0257",
                    "Travels well. Hay net at shoulder height."));
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedPassword;
    private final CountryRepository countryRepository;
    private final PlaceRepository placeRepository;
    private final BorderCrossingRepository borderCrossingRepository;
    private final CorridorRepository corridorRepository;
    private final ClubRepository clubRepository;
    private final HorseSizeClassRepository horseSizeClassRepository;
    private final HorseRepository horseRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleStallRepository vehicleStallRepository;
    private final RateCatalogVersionRepository rateCatalogVersionRepository;
    private final TransportRequestRepository transportRequestRepository;
    private final QuotationRepository quotationRepository;
    private final TransportJobRepository transportJobRepository;
    private final LoadPlanRepository loadPlanRepository;
    private final LoadPlanStallRepository loadPlanStallRepository;
    private final RoutePlanRepository routePlanRepository;
    private final RouteStopRepository routeStopRepository;
    private final RouteLegRepository routeLegRepository;
    private final CrewAssignmentRepository crewAssignmentRepository;
    private final CodeCounterRepository codeCounterRepository;
    private final RegulationCatalogRepository regulationCatalogRepository;
    private final RegulationVersionRepository regulationVersionRepository;
    private final RegulationRuleRepository regulationRuleRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final JobRegulationPinRepository jobRegulationPinRepository;
    private final AuthorityRepository authorityRepository;
    private final AuthoritySubmissionRepository authoritySubmissionRepository;
    private final QuarantinePeriodRepository quarantinePeriodRepository;
    private final NoteRepository noteRepository;
    private final NoteReplyRepository noteReplyRepository;
    private final CatalogSeeder catalogSeeder;

    public DataSeeder(
            RoleRepository roleRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.default.password}") String seedPassword,
            CountryRepository countryRepository,
            PlaceRepository placeRepository,
            BorderCrossingRepository borderCrossingRepository,
            CorridorRepository corridorRepository,
            ClubRepository clubRepository,
            HorseSizeClassRepository horseSizeClassRepository,
            HorseRepository horseRepository,
            VehicleRepository vehicleRepository,
            VehicleStallRepository vehicleStallRepository,
            RateCatalogVersionRepository rateCatalogVersionRepository,
            TransportRequestRepository transportRequestRepository,
            QuotationRepository quotationRepository,
            TransportJobRepository transportJobRepository,
            LoadPlanRepository loadPlanRepository,
            LoadPlanStallRepository loadPlanStallRepository,
            RoutePlanRepository routePlanRepository,
            RouteStopRepository routeStopRepository,
            RouteLegRepository routeLegRepository,
            CrewAssignmentRepository crewAssignmentRepository,
            CodeCounterRepository codeCounterRepository,
            RegulationCatalogRepository regulationCatalogRepository,
            RegulationVersionRepository regulationVersionRepository,
            RegulationRuleRepository regulationRuleRepository,
            DocumentTypeRepository documentTypeRepository,
            JobRegulationPinRepository jobRegulationPinRepository,
            AuthorityRepository authorityRepository,
            AuthoritySubmissionRepository authoritySubmissionRepository,
            QuarantinePeriodRepository quarantinePeriodRepository,
            NoteRepository noteRepository,
            NoteReplyRepository noteReplyRepository,
            CatalogSeeder catalogSeeder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedPassword = seedPassword;
        this.countryRepository = countryRepository;
        this.placeRepository = placeRepository;
        this.borderCrossingRepository = borderCrossingRepository;
        this.corridorRepository = corridorRepository;
        this.clubRepository = clubRepository;
        this.horseSizeClassRepository = horseSizeClassRepository;
        this.horseRepository = horseRepository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleStallRepository = vehicleStallRepository;
        this.rateCatalogVersionRepository = rateCatalogVersionRepository;
        this.transportRequestRepository = transportRequestRepository;
        this.quotationRepository = quotationRepository;
        this.transportJobRepository = transportJobRepository;
        this.loadPlanRepository = loadPlanRepository;
        this.loadPlanStallRepository = loadPlanStallRepository;
        this.routePlanRepository = routePlanRepository;
        this.routeStopRepository = routeStopRepository;
        this.routeLegRepository = routeLegRepository;
        this.crewAssignmentRepository = crewAssignmentRepository;
        this.codeCounterRepository = codeCounterRepository;
        this.regulationCatalogRepository = regulationCatalogRepository;
        this.regulationVersionRepository = regulationVersionRepository;
        this.regulationRuleRepository = regulationRuleRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.jobRegulationPinRepository = jobRegulationPinRepository;
        this.authorityRepository = authorityRepository;
        this.authoritySubmissionRepository = authoritySubmissionRepository;
        this.quarantinePeriodRepository = quarantinePeriodRepository;
        this.noteRepository = noteRepository;
        this.noteReplyRepository = noteReplyRepository;
        this.catalogSeeder = catalogSeeder;
    }

    @Override
    @Transactional
    public void run(@NonNull ApplicationArguments args) {
        seedRolesAndUsers();
        seedHorses(seedClub());
        seedPlacesAndCorridors();
        // After the accounts (the regulation versions name their publisher) and after Flow 3's corridors,
        // so a route it already seeded is reused rather than duplicated.
        catalogSeeder.seed();
        seedVehicles();
        seedDemoJobs();
        seedRegulations();
        seedAuthoritiesAndQuarantinePlaces();
        seedClearanceSubmissionsAndNotes();
    }

    private void seedRolesAndUsers() {
        for (String[] r : ROLES) {
            if (roleRepository.findByName(r[0]).isEmpty()) {
                Role role = new Role();
                role.setName(r[0]);
                role.setDescription(r[1]);
                roleRepository.save(role);
                log.info("Seeded role {}", r[0]);
            }
        }
        for (String[] u : USERS) {
            User user = userRepository.getByEmail(u[0]);
            if (user == null) {
                user = new User();
                user.setEmail(u[0]);
                user.setFirstName(u[1]);
                user.setLastName(u[2]);
                user.setRoles(Set.of(roleRepository.findByName(u[3]).orElseThrow()));
            }
            user.setPassword(passwordEncoder.encode(seedPassword));
            userRepository.save(user);
            log.info("Seeded/Updated {} ({})", u[0], u[3]);
        }
    }

    /**
     * Saigon Turf Club, linked to the customer account (one account per club).
     */
    private Club seedClub() {
        Club club = clubRepository.findByBookingEmail(CLUB_EMAIL).orElseGet(() -> {
            Club created = new Club();
            created.setName(CLUB_NAME);
            created.setBookingEmail(CLUB_EMAIL);
            created.setCountry(countryRepository.getReferenceById("VN"));
            log.info("Seeded club {}", CLUB_NAME);
            return clubRepository.save(created);
        });
        User customer = userRepository.getByEmail(CLUB_EMAIL);
        if (customer != null && customer.getClub() == null) {
            customer.setClub(club);
            userRepository.save(customer);
            log.info("Linked {} to {}", CLUB_EMAIL, CLUB_NAME);
        }
        return club;
    }

    /**
     * Only into a club that has never had a horse: a demo horse edited through the API (a new name or
     * microchip) must not come back, or collide with its edited self on the unique name, on the next start.
     */
    private void seedHorses(Club club) {
        if (horseRepository.existsByClubId(club.getId())) {
            return;
        }
        List<HorseSizeClass> classes = horseSizeClassRepository.findAllByOrderByMinHeightHhAsc();
        for (DemoHorse demo : HORSES) {
            if (horseRepository.findByMicrochip(demo.microchip()).isPresent()) {
                continue;
            }
            BigDecimal height = new BigDecimal(demo.heightHh());
            Horse horse = new Horse();
            horse.setClub(club);
            horse.setName(demo.name());
            horse.setCoat(demo.coat());
            horse.setBreed(demo.breed());
            horse.setSex(demo.sex());
            horse.setDateOfBirth(demo.born());
            horse.setHeightHh(height);
            horse.setWeightKg((short) demo.weightKg());
            horse.setRequiredStall(demo.stall());
            horse.setTemperament(demo.temperament());
            horse.setDeclaredValue(new BigDecimal(demo.value()));
            horse.setMicrochip(demo.microchip());
            horse.setPassportNo(demo.passportNo());
            horse.setHandlingNotes(demo.notes());
            horse.setSizeClass(HorseSizing.sizeClassFor(height, demo.stall(), classes));
            horseRepository.save(horse);
            log.info("Seeded horse {}", demo.name());
        }
    }

    private void seedPlacesAndCorridors() {
        Country vn = countryRepository.findById("VN").orElse(null);
        Country kh = countryRepository.findById("KH").orElse(null);
        Country th = countryRepository.findById("TH").orElse(null);
        Country la = countryRepository.findById("LA").orElse(null);
        Country my = countryRepository.findById("MY").orElse(null);
        if (vn == null || kh == null) return;

        createPlaceIfAbsent(
                "Phú Thọ training centre", PlaceKind.TRAINING_CENTRE, "Ho Chi Minh City", vn, "2 Lê Đại Hành, Q.11");
        createPlaceIfAbsent(
                "Phnom Penh Equestrian Centre", PlaceKind.STABLE, "Phnom Penh", kh, "Hun Sen Blvd, Phnom Penh");
        createPlaceIfAbsent(
                "Svay Rieng welfare stop", PlaceKind.WELFARE_STOP, "Svay Rieng", kh, "National Road 1, Svay Rieng");

        if (borderCrossingRepository.findByName("Mộc Bài – Bavet").isEmpty()) {
            BorderCrossing bc = new BorderCrossing();
            bc.setName("Mộc Bài – Bavet");
            bc.setFromCountry(vn);
            bc.setToCountry(kh);
            bc.setRoadOnly(true);
            borderCrossingRepository.save(bc);
        }

        if (borderCrossingRepository.findByName("Poipet – Aranyaprathet").isEmpty() && th != null) {
            BorderCrossing bc = new BorderCrossing();
            bc.setName("Poipet – Aranyaprathet");
            bc.setFromCountry(kh);
            bc.setToCountry(th);
            bc.setRoadOnly(true);
            borderCrossingRepository.save(bc);
        }

        if (borderCrossingRepository.findByName("Cầu Treo – Nam Phao").isEmpty() && la != null) {
            BorderCrossing bc = new BorderCrossing();
            bc.setName("Cầu Treo – Nam Phao");
            bc.setFromCountry(vn);
            bc.setToCountry(la);
            bc.setRoadOnly(true);
            borderCrossingRepository.save(bc);
        }

        if (borderCrossingRepository.findByName("Sadao – Bukit Kayu Hitam").isEmpty() && th != null && my != null) {
            BorderCrossing bc = new BorderCrossing();
            bc.setName("Sadao – Bukit Kayu Hitam");
            bc.setFromCountry(th);
            bc.setToCountry(my);
            bc.setRoadOnly(true);
            borderCrossingRepository.save(bc);
        }

        createCorridorIfAbsent("AIR PNH -> HKG", TransportMode.AIR, "Phnom Penh", "Hong Kong", 1510);
        createCorridorIfAbsent("AIR SGN -> HKG", TransportMode.AIR, "Ho Chi Minh City", "Hong Kong", 1500);
        createCorridorIfAbsent("RD HCM -> PNH", TransportMode.ROAD, "Ho Chi Minh City", "Phnom Penh", 240);
        createCorridorIfAbsent("RD HCM -> BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", 890);
        createCorridorIfAbsent("RD BKK -> KUL", TransportMode.ROAD, "Bangkok", "Kuala Lumpur", 1480);
        createCorridorIfAbsent("RD HAN -> VTE", TransportMode.ROAD, "Hanoi", "Vientiane", 850);
    }

    private void createCorridorIfAbsent(String code, TransportMode mode, String origin, String dest, int distKm) {
        if (corridorRepository.findByCode(code).isEmpty()) {
            Corridor c = new Corridor();
            c.setCode(code);
            c.setMode(mode);
            c.setOriginCity(origin);
            c.setDestinationCity(dest);
            c.setDistanceKm(distKm);
            corridorRepository.save(c);
        }
    }

    private void createPlaceIfAbsent(String name, PlaceKind kind, String city, Country country, String addr) {
        if (placeRepository.findByName(name).isEmpty()) {
            Place p = new Place();
            p.setName(name);
            p.setKind(kind);
            p.setCity(city);
            p.setCountry(country);
            p.setAddress(addr);
            placeRepository.save(p);
        }
    }

    private void seedVehicles() {
        if (vehicleRepository.findByCode("TX-447").isEmpty()) {
            Vehicle v = new Vehicle();
            v.setCode("TX-447");
            v.setKind(VehicleKind.TRAILER);
            v.setPayloadKg(3200);
            v.setStatus(VehicleStatus.ACTIVE);
            Vehicle saved = vehicleRepository.save(v);

            createStall(saved, (short) 1, StallType.STANDARD, (short) 1, StallSide.LEFT, false);
            createStall(saved, (short) 2, StallType.BOX, (short) 1, StallSide.RIGHT, false);
            createStall(saved, (short) 3, StallType.STANDARD, (short) 2, StallSide.LEFT, false);
            createStall(saved, (short) 4, StallType.CLIMATE, (short) 2, StallSide.RIGHT, false);
            createStall(saved, (short) 5, StallType.BOX, (short) 3, StallSide.LEFT, true);
            createStall(saved, (short) 6, StallType.STANDARD, (short) 3, StallSide.RIGHT, true);
        }

        if (vehicleRepository.findByCode("TK-102").isEmpty()) {
            Vehicle v = new Vehicle();
            v.setCode("TK-102");
            v.setKind(VehicleKind.TRUCK);
            v.setPayloadKg(4500);
            v.setStatus(VehicleStatus.ACTIVE);
            Vehicle saved = vehicleRepository.save(v);

            createStall(saved, (short) 1, StallType.STANDARD, (short) 1, StallSide.LEFT, false);
            createStall(saved, (short) 2, StallType.BOX, (short) 1, StallSide.RIGHT, false);
            createStall(saved, (short) 3, StallType.STANDARD, (short) 2, StallSide.LEFT, true);
            createStall(saved, (short) 4, StallType.CLIMATE, (short) 2, StallSide.RIGHT, true);
        }

        if (vehicleRepository.findByCode("TX-210").isEmpty()) {
            Vehicle v = new Vehicle();
            v.setCode("TX-210");
            v.setKind(VehicleKind.TRAILER);
            v.setPayloadKg(3200);
            v.setStatus(VehicleStatus.MAINTENANCE);
            vehicleRepository.save(v);
        }
    }

    private void createStall(Vehicle v, short pos, StallType type, short row, StallSide side, boolean nearRamp) {
        VehicleStall s = new VehicleStall();
        s.setVehicle(v);
        s.setPositionNo(pos);
        s.setStallType(type);
        s.setRowNo(row);
        s.setSide(side);
        s.setNearRamp(nearRamp);
        vehicleStallRepository.save(s);
    }

    private void seedDemoJobs() {
        advanceCodeCounter(CodePrefix.REQ, (short) 2026, 193);
        advanceCodeCounter(CodePrefix.Q, (short) 2026, 188);
        advanceCodeCounter(CodePrefix.CBRT, (short) 2026, 41);

        if (transportJobRepository.findByCode("CBRT-2026-041").isPresent()) {
            return;
        }

        Country vn = countryRepository.findById("VN").orElse(null);
        if (vn == null) return;

        Club club = clubRepository.findByName("Saigon Turf Club").orElseGet(() -> {
            Club c = new Club();
            c.setName("Saigon Turf Club");
            c.setBookingEmail("bookings@saigonturf.vn");
            c.setCountry(vn);
            return clubRepository.save(c);
        });

        HorseSizeClass sizeM = horseSizeClassRepository
                .findByCode("M")
                .orElseGet(() -> horseSizeClassRepository.findAll().get(0));

        Horse shadowfax = createHorseIfAbsent(
                "Shadowfax",
                club,
                HorseCoat.GREY,
                HorseSex.GELDING,
                (short) 510,
                sizeM,
                Temperament.CALM,
                StallType.STANDARD);
        Horse nightfall = createHorseIfAbsent(
                "Nightfall",
                club,
                HorseCoat.BLACK,
                HorseSex.MARE,
                (short) 478,
                sizeM,
                Temperament.NERVOUS,
                StallType.CLIMATE);
        Horse copperKing = createHorseIfAbsent(
                "Copper King",
                club,
                HorseCoat.CHESTNUT,
                HorseSex.STALLION,
                (short) 583,
                sizeM,
                Temperament.AGGRESSIVE,
                StallType.BOX);
        Horse silverBell = createHorseIfAbsent(
                "Silver Bell",
                club,
                HorseCoat.GREY,
                HorseSex.MARE,
                (short) 445,
                sizeM,
                Temperament.CALM,
                StallType.STANDARD);

        User yen = userRepository.getByEmail("yen.vu@equifreight.vn");
        User khoi = userRepository.getByEmail("khoi.do@equifreight.vn");
        User customer = userRepository.getByEmail("bookings@saigonturf.vn");

        RateCatalogVersion rateVersion = rateCatalogVersionRepository
                .findByVersionNo(1)
                .orElseGet(() -> {
                    RateCatalogVersion rv = new RateCatalogVersion();
                    rv.setVersionNo(1);
                    rv.setStatus(CatalogStatus.PUBLISHED);
                    rv.setPublishedAt(Instant.now());
                    rv.setPublishedBy(yen);
                    rv.setChangeNote("Baseline rate catalog v1");
                    return rateCatalogVersionRepository.save(rv);
                });

        // Create Request REQ-2026-0193
        TransportRequest req = new TransportRequest();
        req.setCode("REQ-2026-0193");
        req.setClub(club);
        req.setCreatedBy(customer);
        req.setStatus(RequestStatus.SUBMITTED);
        // V17: a request has a code exactly when it was submitted (the frames' 26 Sep 09:14).
        req.setSubmittedAt(Instant.parse("2026-09-26T02:14:00Z"));
        req.setMode(TransportMode.ROAD);
        req.setTrailer(TrailerType.PRIVATE);
        req.setOriginPlace(placeRepository.findByName("Phú Thọ training centre").orElse(null));
        req.setDestinationPlace(
                placeRepository.findByName("Phnom Penh Equestrian Centre").orElse(null));
        req.setCorridor(corridorRepository.findByCode("RD HCM -> PNH").orElse(null));
        req.setDepartureDate(LocalDate.of(2026, 10, 18));
        req.setVetEscort(true);
        req.setHorses(new ArrayList<>());
        TransportRequest savedReq = transportRequestRepository.save(req);

        addRequestHorse(savedReq, shadowfax);
        addRequestHorse(savedReq, nightfall);
        addRequestHorse(savedReq, copperKing);
        addRequestHorse(savedReq, silverBell);

        savedReq.setStatus(RequestStatus.APPROVED);
        transportRequestRepository.save(savedReq);

        // Create Quotation Q-2026-0188
        Quotation quote = new Quotation();
        quote.setCode("Q-2026-0188");
        quote.setRequest(savedReq);
        quote.setVersionNo((short) 1);
        quote.setStatus(QuotationStatus.ACCEPTED);
        quote.setRateCatalogVersion(rateVersion);
        quote.setCurrency("USD");
        quote.setPreparedBy(yen);
        quote.setIssuedAt(Instant.now());
        quote.setSubtotal(new BigDecimal("4200.00"));
        quote.setTotal(new BigDecimal("4200.00"));
        Quotation savedQuote = quotationRepository.save(quote);

        // Create Job CBRT-2026-041
        TransportJob job = new TransportJob();
        job.setCode("CBRT-2026-041");
        job.setRequest(savedReq);
        job.setQuotation(savedQuote);
        job.setApprovedBy(yen);
        job.setApprovedAt(Instant.now());
        job.setStage(JobStage.DOCUMENTS);
        job.setDossierStatus(DossierStatus.OPEN);
        job.setTripStatus(TripStatus.NOT_STARTED);
        job.setPlannedDepartureAt(Instant.parse("2026-10-18T06:00:00Z"));
        job.setPlannedArrivalAt(Instant.parse("2026-10-18T12:30:00Z"));
        job.setWindowStart(Instant.parse("2026-10-18T11:00:00Z"));
        job.setWindowEnd(Instant.parse("2026-10-18T14:00:00Z"));
        TransportJob savedJob = transportJobRepository.save(job);

        // Vehicle TX-447
        Vehicle tx447 = vehicleRepository.findByCode("TX-447").orElseThrow();
        List<VehicleStall> stalls = vehicleStallRepository.findByVehicleIdOrderByPositionNo(tx447.getId());

        // Load plan for CBRT-2026-041 (matching Figma demo state: 3 loaded, 1 conflict, 1 to load)
        LoadPlan lp = new LoadPlan();
        lp.setJob(savedJob);
        lp.setVehicle(tx447);
        lp.setStatus(LoadPlanStatus.DRAFT);
        LoadPlan savedLp = loadPlanRepository.save(lp);

        assignStallDirect(savedLp, stalls.get(0), shadowfax);
        assignStallDirect(savedLp, stalls.get(2), copperKing); // Conflict: stallion beside mare, in standard stall
        assignStallDirect(savedLp, stalls.get(3), nightfall);
        // silverBell unassigned!

        // Route plan for CBRT-2026-041 (v1, CONFIRMED)
        Place origin = placeRepository.findByName("Phú Thọ training centre").orElse(null);
        Place dest = placeRepository.findByName("Phnom Penh Equestrian Centre").orElse(null);
        Place welfare = placeRepository.findByName("Svay Rieng welfare stop").orElse(null);
        BorderCrossing border =
                borderCrossingRepository.findByName("Mộc Bài – Bavet").orElse(null);

        RoutePlan rp = new RoutePlan();
        rp.setJob(savedJob);
        rp.setVersionNo((short) 1);
        rp.setStatus(RoutePlanStatus.CONFIRMED);
        rp.setDistanceKm(240);
        rp.setDurationMin(390); // 6.5 hours
        rp.setConfirmedBy(khoi);
        rp.setConfirmedAt(Instant.now());
        RoutePlan savedRp = routePlanRepository.save(rp);

        RouteStop s1 = createStop(
                savedRp,
                (short) 1,
                RouteStopKind.PICKUP,
                origin,
                null,
                Instant.parse("2026-10-18T06:00:00Z"),
                (short) 45,
                "Loading and condition check, logged with photos.");
        RouteStop s2 = createStop(
                savedRp,
                (short) 2,
                RouteStopKind.BORDER,
                null,
                border,
                Instant.parse("2026-10-18T08:30:00Z"),
                (short) 60,
                "Vietnam export clearance and Cambodia entry. Recorded per leg as Cleared or Held.");
        RouteStop s3 = createStop(
                savedRp,
                (short) 3,
                RouteStopKind.WELFARE,
                welfare,
                null,
                Instant.parse("2026-10-18T09:30:00Z"),
                (short) 45,
                "45-minute rest, water and hay, welfare check by the escort.");
        RouteStop s4 = createStop(
                savedRp,
                (short) 4,
                RouteStopKind.DELIVERY,
                dest,
                null,
                Instant.parse("2026-10-18T12:30:00Z"),
                (short) 30,
                "Handover to receiving groom with final condition log. Planned before 14:00 window close.");

        createLeg(savedRp, (short) 1, s1, s2, tx447, 70, 120);
        createLeg(savedRp, (short) 2, s2, s3, tx447, 50, 60);
        createLeg(savedRp, (short) 3, s3, s4, tx447, 120, 135);

        // Assign crew: Driver Minh, Grooms Hoa & Tuấn
        User minh = userRepository.getByEmail("minh.tran@equifreight.vn");
        User hoa = userRepository.getByEmail("hoa.le@equifreight.vn");
        User tuan = userRepository.getByEmail("tuan.pham@equifreight.vn");

        assignCrewMember(savedJob, minh, CrewRole.DRIVER);
        assignCrewMember(savedJob, hoa, CrewRole.GROOM);
        assignCrewMember(savedJob, tuan, CrewRole.GROOM);

        log.info("Seeded canonical job CBRT-2026-041 with route and load plans");
    }

    private Horse createHorseIfAbsent(
            String name,
            Club club,
            HorseCoat coat,
            HorseSex sex,
            short weight,
            HorseSizeClass size,
            Temperament temp,
            StallType stall) {
        return horseRepository.findByName(name).orElseGet(() -> {
            Horse h = new Horse();
            h.setName(name);
            h.setClub(club);
            h.setCoat(coat);
            h.setSex(sex);
            h.setWeightKg(weight);
            h.setSizeClass(size);
            h.setTemperament(temp);
            h.setRequiredStall(stall);
            h.setDeclaredValue(new BigDecimal("50000.00"));
            return horseRepository.save(h);
        });
    }

    /** Snapshots the horse's own size class, the one the registry derived from its height and stall. */
    private void addRequestHorse(TransportRequest req, Horse horse) {
        RequestHorse rh = new RequestHorse();
        rh.setRequest(req);
        rh.setHorse(horse);
        rh.setDeclaredValue(horse.getDeclaredValue());
        rh.setSex(horse.getSex());
        rh.setSizeClassCode(horse.getSizeClass().getCode());
        rh.setRequiredStall(horse.getRequiredStall());
        rh.getId().setRequestId(req.getId());
        rh.getId().setHorseId(horse.getId());
        req.getHorses().add(rh);
    }

    private void assignStallDirect(LoadPlan plan, VehicleStall stall, Horse horse) {
        LoadPlanStall lps = new LoadPlanStall();
        lps.setLoadPlan(plan);
        lps.setVehicleStall(stall);
        lps.setHorse(horse);
        loadPlanStallRepository.save(lps);
    }

    private RouteStop createStop(
            RoutePlan plan,
            short seq,
            RouteStopKind kind,
            Place place,
            BorderCrossing bc,
            Instant plannedAt,
            short stayMin,
            String details) {
        RouteStop s = new RouteStop();
        s.setRoutePlan(plan);
        s.setSeq(seq);
        s.setKind(kind);
        s.setPlace(place);
        s.setBorderCrossing(bc);
        s.setPlannedAt(plannedAt);
        s.setPlannedStayMin(stayMin);
        s.setDetails(details);
        return routeStopRepository.save(s);
    }

    private void createLeg(RoutePlan plan, short seq, RouteStop from, RouteStop to, Vehicle v, int distance, int min) {
        RouteLeg leg = new RouteLeg();
        leg.setRoutePlan(plan);
        leg.setSeq(seq);
        leg.setFromStop(from);
        leg.setToStop(to);
        leg.setMode(TransportMode.ROAD);
        leg.setVehicle(v);
        leg.setDistanceKm(distance);
        leg.setPlannedMin(min);
        routeLegRepository.save(leg);
    }

    private void assignCrewMember(TransportJob job, User user, CrewRole role) {
        CrewAssignment ca = new CrewAssignment();
        ca.setJob(job);
        ca.setUser(user);
        ca.setCrewRole(role);
        ca.getId().setJobId(job.getId());
        ca.getId().setUserId(user.getId());
        crewAssignmentRepository.save(ca);
    }

    private void seedRegulations() {
        if (regulationCatalogRepository.count() > 0) {
            return;
        }

        User lan = userRepository.getByEmail("lan.nguyen@equifreight.vn");
        User yen = userRepository.getByEmail("yen.vu@equifreight.vn");
        User publisher = lan != null ? lan : yen;

        DocumentType piro = documentTypeRepository
                .findByCode("PIROPLASMOSIS_TEST")
                .orElseGet(() -> {
                    DocumentType dt = new DocumentType();
                    dt.setCode("PIROPLASMOSIS_TEST");
                    dt.setName("Equine piroplasmosis test result");
                    dt.setScope(DocumentScope.PER_HORSE);
                    dt.setProvidedBy(DocumentProvider.CUSTOMER);
                    return documentTypeRepository.save(dt);
                });

        DocumentType passport =
                documentTypeRepository.findByCode("EQUINE_PASSPORT").orElse(null);
        DocumentType flu =
                documentTypeRepository.findByCode("INFLUENZA_VACCINATION").orElse(null);
        DocumentType eia = documentTypeRepository.findByCode("EIA_TEST").orElse(null);
        DocumentType health =
                documentTypeRepository.findByCode("EXPORT_HEALTH_CERT").orElse(null);
        DocumentType ownership =
                documentTypeRepository.findByCode("PROOF_OF_OWNERSHIP").orElse(null);
        DocumentType permit = documentTypeRepository.findByCode("IMPORT_PERMIT").orElse(null);
        DocumentType insurance =
                documentTypeRepository.findByCode("TRANSIT_INSURANCE").orElse(null);
        DocumentType customs =
                documentTypeRepository.findByCode("CUSTOMS_VALUE_DECLARATION").orElse(null);

        Country kh = countryRepository.findById("KH").orElse(null);
        if (kh != null) {
            RegulationCatalog khCat = new RegulationCatalog();
            khCat.setCountry(kh);
            khCat.setName("Cambodia import");
            khCat = regulationCatalogRepository.save(khCat);

            // v5 RETIRED
            RegulationVersion v5 = createVersion(khCat, 5, CatalogStatus.RETIRED, (short) 21, (short) 7, (short) 2);
            v5.setPublishedAt(Instant.parse("2026-06-14T08:00:00Z"));
            v5.setPublishedBy(publisher);
            regulationVersionRepository.saveAndFlush(v5);

            // v6 RETIRED
            RegulationVersion v6 = createVersion(khCat, 6, CatalogStatus.RETIRED, (short) 21, (short) 7, (short) 2);
            v6.setPublishedAt(Instant.parse("2026-08-02T08:00:00Z"));
            v6.setPublishedBy(publisher);
            regulationVersionRepository.saveAndFlush(v6);

            // v7 PUBLISHED
            RegulationVersion v7 = createVersion(khCat, 7, CatalogStatus.DRAFT, (short) 21, (short) 7, (short) 2);
            if (passport != null)
                createRule(v7, passport, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
            if (flu != null) createRule(v7, flu, RegulationRuleKind.BOOSTER_WINDOW, (short) 7, (short) 180, true, null);
            if (eia != null)
                createRule(
                        v7,
                        eia,
                        RegulationRuleKind.WINDOW_BEFORE_DEPARTURE,
                        null,
                        (short) 60,
                        true,
                        "Sampled within 60 days of departure");
            if (health != null)
                createRule(v7, health, RegulationRuleKind.WINDOW_BEFORE_DEPARTURE, null, (short) 10, true, null);
            if (ownership != null) createRule(v7, ownership, RegulationRuleKind.PRESENCE_ONLY, null, null, true, null);
            if (permit != null)
                createRule(v7, permit, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
            if (insurance != null)
                createRule(v7, insurance, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
            if (customs != null)
                createRule(v7, customs, RegulationRuleKind.PRESENCE_ONLY, null, null, true, "1 per crossing");
            v7.setStatus(CatalogStatus.PUBLISHED);
            v7.setPublishedAt(Instant.parse("2026-09-22T08:00:00Z"));
            v7.setPublishedBy(publisher);
            final RegulationVersion savedV7 = regulationVersionRepository.saveAndFlush(v7);

            // v8 DRAFT
            RegulationVersion v8 = createVersion(khCat, 8, CatalogStatus.DRAFT, (short) 21, (short) 7, (short) 2);
            if (passport != null)
                createRule(v8, passport, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
            if (flu != null) createRule(v8, flu, RegulationRuleKind.BOOSTER_WINDOW, (short) 7, (short) 180, true, null);
            if (eia != null)
                createRule(
                        v8,
                        eia,
                        RegulationRuleKind.WINDOW_BEFORE_DEPARTURE,
                        null,
                        (short) 45,
                        true,
                        "Was 60 in v7. Source: GDAHP notice 14/2026.");
            if (health != null)
                createRule(v8, health, RegulationRuleKind.WINDOW_BEFORE_DEPARTURE, null, (short) 10, true, null);
            if (ownership != null) createRule(v8, ownership, RegulationRuleKind.PRESENCE_ONLY, null, null, true, null);
            createRule(
                    v8,
                    piro,
                    RegulationRuleKind.WINDOW_BEFORE_DEPARTURE,
                    null,
                    (short) 30,
                    true,
                    "New requirement under GDAHP circular 2026.");
            if (permit != null)
                createRule(v8, permit, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
            if (insurance != null)
                createRule(
                        v8,
                        insurance,
                        RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS,
                        null,
                        (short) 2,
                        false,
                        "Changed to optional recommendation.");
            if (customs != null)
                createRule(v8, customs, RegulationRuleKind.PRESENCE_ONLY, null, null, true, "1 per crossing");

            // Pin demo job CBRT-2026-041 to v7
            transportJobRepository.findByCode("CBRT-2026-041").ifPresent(job -> {
                JobRegulationPin pin = new JobRegulationPin();
                pin.setJob(job);
                pin.setRegulationVersion(savedV7);
                pin.setRole(RegulationRole.DESTINATION);
                pin.getId().setJobId(job.getId());
                pin.getId().setRegulationVersionId(savedV7.getId());
                jobRegulationPinRepository.save(pin);
            });
            log.info("Seeded Cambodia regulation catalog v5-v8");
        }

        seedCountryCatalog(
                "VN",
                "Vietnam import",
                5,
                publisher,
                passport,
                flu,
                eia,
                health,
                ownership,
                permit,
                insurance,
                customs);
        seedCountryCatalog(
                "TH",
                "Thailand import",
                4,
                publisher,
                passport,
                flu,
                eia,
                health,
                ownership,
                permit,
                insurance,
                customs);
        seedCountryCatalog(
                "LA", "Laos import", 3, publisher, passport, flu, eia, health, ownership, permit, insurance, customs);
        seedCountryCatalog(
                "MY",
                "Malaysia import",
                6,
                publisher,
                passport,
                flu,
                eia,
                health,
                ownership,
                permit,
                insurance,
                customs);
        seedCountryCatalog(
                "HK",
                "Hong Kong import",
                9,
                publisher,
                passport,
                flu,
                eia,
                health,
                ownership,
                permit,
                insurance,
                customs);
    }

    private void seedCountryCatalog(
            String countryCode,
            String name,
            int versionNo,
            User publisher,
            DocumentType passport,
            DocumentType flu,
            DocumentType eia,
            DocumentType health,
            DocumentType ownership,
            DocumentType permit,
            DocumentType insurance,
            DocumentType customs) {
        Country c = countryRepository.findById(countryCode).orElse(null);
        if (c == null) return;
        RegulationCatalog cat = new RegulationCatalog();
        cat.setCountry(c);
        cat.setName(name);
        cat = regulationCatalogRepository.save(cat);

        RegulationVersion v = createVersion(cat, versionNo, CatalogStatus.DRAFT, (short) 21, (short) 7, (short) 2);
        if (passport != null)
            createRule(v, passport, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
        if (flu != null) createRule(v, flu, RegulationRuleKind.BOOSTER_WINDOW, (short) 7, (short) 180, true, null);
        if (eia != null) createRule(v, eia, RegulationRuleKind.WINDOW_BEFORE_DEPARTURE, null, (short) 60, true, null);
        if (health != null)
            createRule(v, health, RegulationRuleKind.WINDOW_BEFORE_DEPARTURE, null, (short) 10, true, null);
        if (ownership != null) createRule(v, ownership, RegulationRuleKind.PRESENCE_ONLY, null, null, true, null);
        if (permit != null)
            createRule(v, permit, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
        if (insurance != null)
            createRule(v, insurance, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
        if (customs != null) createRule(v, customs, RegulationRuleKind.PRESENCE_ONLY, null, null, true, null);
        v.setStatus(CatalogStatus.PUBLISHED);
        v.setPublishedAt(Instant.now());
        v.setPublishedBy(publisher);
        regulationVersionRepository.saveAndFlush(v);
        log.info("Seeded {} regulation catalog v{}", name, versionNo);
    }

    private RegulationVersion createVersion(
            RegulationCatalog catalog, int versionNo, CatalogStatus status, short lead, short quar, short buf) {
        RegulationVersion v = new RegulationVersion();
        v.setCatalog(catalog);
        v.setVersionNo(versionNo);
        v.setStatus(status);
        v.setLeadTimeDays(lead);
        v.setQuarantineMinDays(quar);
        v.setArrivalBufferDays(buf);
        return regulationVersionRepository.saveAndFlush(v);
    }

    private void createRule(
            RegulationVersion version,
            DocumentType docType,
            RegulationRuleKind kind,
            Short minDays,
            Short maxDays,
            boolean mandatory,
            String desc) {
        RegulationRule r = new RegulationRule();
        r.setVersion(version);
        r.setDocumentType(docType);
        r.setRuleKind(kind);
        r.setMinDays(minDays);
        r.setMaxDays(maxDays);
        r.setMandatory(mandatory);
        r.setDescription(desc);
        regulationRuleRepository.saveAndFlush(r);
    }

    private void seedAuthoritiesAndQuarantinePlaces() {
        if (authorityRepository.count() > 0) {
            return;
        }
        createAuthority("Regional Animal Health Office No. VI (RAHO6)", "VN", AuthorityKind.VETERINARY, (short) 5);
        createAuthority("Mộc Bài Customs Sub-Department", "VN", AuthorityKind.CUSTOMS, (short) 2);
        createAuthority(
                "General Directorate of Animal Health and Production (GDAHP)", "KH", AuthorityKind.VETERINARY, (short)
                        4);
        createAuthority("Bavet International Border Customs", "KH", AuthorityKind.CUSTOMS, (short) 2);
        createAuthority("Cambodia Border Animal Quarantine Station", "KH", AuthorityKind.QUARANTINE, (short) 1);

        createPlaceIfMissing(
                "Phú Thọ Pre-Export Quarantine Station",
                PlaceKind.QUARANTINE,
                "Ho Chi Minh City",
                "VN",
                "District 11, HCMC");
        createPlaceIfMissing(
                "Svay Rieng Border Quarantine Station",
                PlaceKind.QUARANTINE,
                "Svay Rieng",
                "KH",
                "National Road 1, Svay Rieng");
        createPlaceIfMissing(
                "Phnom Penh Equestrian Quarantine Facility",
                PlaceKind.QUARANTINE,
                "Phnom Penh",
                "KH",
                "Dangkao, Phnom Penh");
        log.info("Seeded regulatory authorities and quarantine stations");
    }

    private void createAuthority(String name, String countryCode, AuthorityKind kind, short slaDays) {
        if (authorityRepository.findByName(name).isPresent()) {
            return;
        }
        Authority a = new Authority();
        a.setName(name);
        a.setCountry(countryRepository.getReferenceById(countryCode));
        a.setKind(kind);
        a.setSlaDays(slaDays);
        authorityRepository.save(a);
    }

    private void createPlaceIfMissing(String name, PlaceKind kind, String city, String countryCode, String address) {
        if (placeRepository.findByName(name).isPresent()) {
            return;
        }
        Place p = new Place();
        p.setName(name);
        p.setKind(kind);
        p.setCity(city);
        p.setCountry(countryRepository.getReferenceById(countryCode));
        p.setAddress(address);
        placeRepository.save(p);
    }

    private void seedClearanceSubmissionsAndNotes() {
        TransportJob job = transportJobRepository.findByCode("CBRT-2026-041").orElse(null);
        if (job == null) return;

        User yen = userRepository.getByEmail("yen.vu@equifreight.vn");
        User lan = userRepository.getByEmail("lan.nguyen@equifreight.vn");
        User customer = userRepository.getByEmail("bookings@saigonturf.vn");
        Club saigonClub = clubRepository.findByName("Saigon Turf Club").orElse(null);

        // Authority Submissions
        if (authoritySubmissionRepository.count() == 0) {
            Authority raho6 = authorityRepository
                    .findByName("Regional Animal Health Office No. VI (RAHO6)")
                    .orElse(null);
            Authority gdahp = authorityRepository
                    .findByName("General Directorate of Animal Health and Production (GDAHP)")
                    .orElse(null);

            if (raho6 != null) {
                AuthoritySubmission sub1 = new AuthoritySubmission();
                sub1.setJob(job);
                sub1.setAuthority(raho6);
                sub1.setKind(SubmissionKind.EXPORT_HEALTH_CERTS);
                sub1.setStatus(SubmissionStatus.FILED);
                sub1.setFiledAt(Instant.now().minus(java.time.Duration.ofDays(2)));
                sub1.setFiledBy(yen != null ? yen : lan);
                sub1.setReferenceNo("RAHO6-EXP-2026-081");
                sub1.setExpectedBy(LocalDate.now().plusDays(3));
                authoritySubmissionRepository.save(sub1);
            }
            if (gdahp != null) {
                AuthoritySubmission sub2 = new AuthoritySubmission();
                sub2.setJob(job);
                sub2.setAuthority(gdahp);
                sub2.setKind(SubmissionKind.IMPORT_PERMIT);
                sub2.setStatus(SubmissionStatus.READY_TO_FILE);
                sub2.setExpectedBy(LocalDate.now().plusDays(6));
                authoritySubmissionRepository.save(sub2);
            }
            log.info("Seeded authority submissions for CBRT-2026-041");
        }

        // Quarantine Period
        if (quarantinePeriodRepository.count() == 0) {
            Place pt = placeRepository
                    .findByName("Phú Thọ Pre-Export Quarantine Station")
                    .orElse(null);
            if (pt != null) {
                QuarantinePeriod qp = new QuarantinePeriod();
                qp.setJob(job);
                qp.setPlace(pt);
                qp.setStartsOn(LocalDate.now().minusDays(10));
                qp.setEndsOn(LocalDate.now().minusDays(3));
                qp.setCompletedAt(Instant.now().minus(java.time.Duration.ofDays(3)));
                quarantinePeriodRepository.save(qp);
                log.info("Seeded completed quarantine period for CBRT-2026-041");
            }
        }

        // Customer Notes
        if (noteRepository.count() == 0 && saigonClub != null && customer != null) {
            Note n1 = new Note();
            n1.setClub(saigonClub);
            n1.setJob(job);
            n1.setRequest(job.getRequest());
            n1.setTopic(NoteTopic.DOCUMENTS);
            n1.setRoutedRole("TRANSPORT_SPECIALIST");
            n1.setCreatedBy(customer);
            n1.setSubject("Equine Influenza vaccination window");
            n1.setBody(
                    "Copper King's EI booster is scheduled for 10 Oct at the club clinic. Can we submit the updated veterinary record 7 days before departure instead of the required 14 days?");
            n1.setStatus(NoteStatus.ANSWERED);
            Note savedN1 = noteRepository.save(n1);

            if (lan != null) {
                NoteReply r1 = new NoteReply();
                r1.setNote(savedN1);
                r1.setAuthor(lan);
                r1.setBody(
                        "Reviewed with Cambodia GDAHP requirements. 7 days is within the allowable window if accompanied by the clinic's certification of no post-vaccinal adverse reaction. Please upload the clinic certificate as soon as administered.");
                noteReplyRepository.save(r1);
            }

            Note n2 = new Note();
            n2.setClub(saigonClub);
            n2.setJob(job);
            n2.setRequest(job.getRequest());
            n2.setTopic(NoteTopic.TRIP);
            n2.setRoutedRole("FLEET_ROUTE_COORDINATOR");
            n2.setCreatedBy(customer);
            n2.setSubject("Border transit timing at Mộc Bài – Bavet");
            n2.setBody(
                    "Please confirm expected arrival at Mộc Bài border. The owner's escort veterinarian will meet the convoy at Bavet side for handover inspection.");
            n2.setStatus(NoteStatus.OPEN);
            noteRepository.save(n2);
            log.info("Seeded customer notes and reply for CBRT-2026-041");
        }
    }

    private void advanceCodeCounter(CodePrefix prefix, short year, int value) {
        CodeCounter.Key key = new CodeCounter.Key(prefix, year);
        CodeCounter counter = codeCounterRepository.findById(key).orElseGet(() -> {
            CodeCounter c = new CodeCounter();
            c.setId(key);
            c.setLastValue(0);
            return c;
        });
        if (counter.getLastValue() < value) {
            counter.setLastValue(value);
            codeCounterRepository.save(counter);
        }
    }

    private record DemoHorse(
            String name,
            HorseCoat coat,
            String breed,
            HorseSex sex,
            LocalDate born,
            String heightHh,
            int weightKg,
            StallType stall,
            Temperament temperament,
            String value,
            String microchip,
            String passportNo,
            String notes) {}
}
