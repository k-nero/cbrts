package com.equifreight.configuration;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.StorageException;
import com.equifreight.repository.*;
import com.equifreight.service.HorseSizing;
import com.equifreight.service.JobTripService;
import com.equifreight.service.storage.FileStorage;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import lombok.extern.log4j.Log4j2;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ByteArrayResource;
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

    /**
     * ISO 3166-1 alpha-2 code, name: the countries we serve.
     */
    private static final String[][] COUNTRIES = {
        {"VN", "Vietnam"},
        {"KH", "Cambodia"},
        {"TH", "Thailand"},
        {"LA", "Laos"},
        {"MY", "Malaysia"},
        {"HK", "Hong Kong"}
    };

    /**
     * The stall width each class takes, and the height bands HorseSizing derives a horse's class from.
     */
    private static final List<SizeClass> SIZE_CLASSES = List.of(
            new SizeClass("S", 32, "10.0"),
            new SizeClass("M", 32, "14.3"),
            new SizeClass("L", 48, "16.3"),
            new SizeClass("XL", 96, "17.3"));

    private static final List<DocType> DOCUMENT_TYPES = List.of(
            new DocType("EQUINE_PASSPORT", "Equine passport", DocumentScope.PER_HORSE, DocumentProvider.CUSTOMER),
            new DocType(
                    "INFLUENZA_VACCINATION",
                    "Equine influenza vaccination record",
                    DocumentScope.PER_HORSE,
                    DocumentProvider.CUSTOMER),
            new DocType("EIA_TEST", "EIA (Coggins) test result", DocumentScope.PER_HORSE, DocumentProvider.CUSTOMER),
            new DocType(
                    "EXPORT_HEALTH_CERT",
                    "Export health certificate",
                    DocumentScope.PER_HORSE,
                    DocumentProvider.AUTHORITY),
            new DocType("PROOF_OF_OWNERSHIP", "Proof of ownership", DocumentScope.PER_HORSE, DocumentProvider.CUSTOMER),
            new DocType("IMPORT_PERMIT", "Import permit", DocumentScope.PER_SHIPMENT, DocumentProvider.AUTHORITY),
            new DocType(
                    "TRANSIT_INSURANCE",
                    "Transit insurance certificate",
                    DocumentScope.PER_SHIPMENT,
                    DocumentProvider.CUSTOMER),
            new DocType(
                    "CUSTOMS_VALUE_DECLARATION",
                    "Customs value declaration",
                    DocumentScope.PER_SHIPMENT,
                    DocumentProvider.CUSTOMER));

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
    private final ChecklistItemRepository checklistItemRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final StoredFileRepository storedFileRepository;
    private final FileStorage fileStorage;
    private final CatalogSeeder catalogSeeder;
    private final JobTripService jobTrips;

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
            ChecklistItemRepository checklistItemRepository,
            DocumentVersionRepository documentVersionRepository,
            StoredFileRepository storedFileRepository,
            FileStorage fileStorage,
            CatalogSeeder catalogSeeder,
            JobTripService jobTrips) {
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
        this.checklistItemRepository = checklistItemRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.storedFileRepository = storedFileRepository;
        this.fileStorage = fileStorage;
        this.catalogSeeder = catalogSeeder;
        this.jobTrips = jobTrips;
    }

    @Override
    @Transactional
    public void run(@NonNull ApplicationArguments args) {
        // Reference data the rest of the seed (and the app itself) looks up by code.
        seedCountries();
        seedHorseSizeClasses();
        seedDocumentTypes();
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
        seedHongKongAuthorities();
        seedClearanceSubmissionsAndNotes();
    }

    private void seedCountries() {
        for (String[] c : COUNTRIES) {
            if (countryRepository.findByCode(c[0]).isEmpty()) {
                Country country = new Country();
                country.setCode(c[0]);
                country.setName(c[1]);
                countryRepository.save(country);
                log.info("Seeded country {}", c[0]);
            }
        }
    }

    private void seedHorseSizeClasses() {
        for (SizeClass s : SIZE_CLASSES) {
            if (horseSizeClassRepository.findByCode(s.code()).isEmpty()) {
                HorseSizeClass sizeClass = new HorseSizeClass();
                sizeClass.setCode(s.code());
                sizeClass.setWidthIn((short) s.widthIn());
                sizeClass.setMinHeightHh(new BigDecimal(s.minHeightHh()));
                horseSizeClassRepository.save(sizeClass);
                log.info("Seeded horse size class {}", s.code());
            }
        }
    }

    private void seedDocumentTypes() {
        for (DocType d : DOCUMENT_TYPES) {
            if (!documentTypeRepository.existsByCode(d.code())) {
                DocumentType type = new DocumentType();
                type.setCode(d.code());
                type.setName(d.name());
                type.setScope(d.scope());
                type.setProvidedBy(d.providedBy());
                type.setCategory(d.category());
                documentTypeRepository.save(type);
                log.info("Seeded document type {}", d.code());
            }
        }
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
            created.setCountry(countryRepository.findByCode("VN").orElse(null));
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
        Country vn = countryRepository.findByCode("VN").orElse(null);
        Country kh = countryRepository.findByCode("KH").orElse(null);
        Country th = countryRepository.findByCode("TH").orElse(null);
        Country la = countryRepository.findByCode("LA").orElse(null);
        Country my = countryRepository.findByCode("MY").orElse(null);
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

        Country hk = countryRepository.findByCode("HK").orElse(null);
        createCorridorIfAbsent("AIR PNH -> HKG", TransportMode.AIR, "Phnom Penh", "Hong Kong", 1510, kh, hk);
        createCorridorIfAbsent("AIR SGN -> HKG", TransportMode.AIR, "Ho Chi Minh City", "Hong Kong", 1500, vn, hk);
        createCorridorIfAbsent("RD HCM -> PNH", TransportMode.ROAD, "Ho Chi Minh City", "Phnom Penh", 240, vn, kh);
        createCorridorIfAbsent("RD HCM -> BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", 890, vn, th);
        createCorridorIfAbsent("RD BKK -> KUL", TransportMode.ROAD, "Bangkok", "Kuala Lumpur", 1480, th, my);
        createCorridorIfAbsent("RD HAN -> VTE", TransportMode.ROAD, "Hanoi", "Vientiane", 850, vn, la);
    }

    /** {@code from} and {@code to} are the countries of its two ends (US-F7-01); skipped when one isn't seeded. */
    private void createCorridorIfAbsent(
            String code, TransportMode mode, String origin, String dest, int distKm, Country from, Country to) {
        if (from == null || to == null) return;
        if (corridorRepository.findByCode(code).isEmpty()) {
            Corridor c = new Corridor();
            c.setCode(code);
            c.setMode(mode);
            c.setOriginCity(origin);
            c.setDestinationCity(dest);
            c.setDistanceKm(distKm);
            c.setDrivingDays(Corridor.drivingDaysFor(distKm));
            c.setOriginCountry(from);
            c.setDestinationCountry(to);
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

    /**
     * The demo fleet (US-F7-01): TX-447 is based in Vietnam with permits for Cambodia and Thailand; TK-102 in Vietnam
     * with permits for every neighbour; TX-210 is in maintenance; HK-031 is based in Hong Kong and runs only the road
     * leg after a flight, so the Vietnamese trucks' pickers show it refused. Each runs every road corridor its permits
     * cover.
     */
    private void seedVehicles() {
        // Every vehicle is based somewhere, so the fleet needs the countries first (seedCountries).
        if (countryRepository.findByCode("VN").isEmpty()) return;
        if (vehicleRepository.findByCode("TX-447").isEmpty()) {
            Vehicle v = new Vehicle();
            v.setCode("TX-447");
            v.setKind(VehicleKind.TRAILER);
            v.setPayloadKg(3200);
            v.setStatus(VehicleStatus.ACTIVE);
            basedIn(v, "Ho Chi Minh City", "VN", "KH", "TH");
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
            basedIn(v, "Ho Chi Minh City", "VN", "KH", "TH", "LA", "MY");
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
            basedIn(v, "Ho Chi Minh City", "VN", "KH");
            vehicleRepository.save(v);
        }

        if (vehicleRepository.findByCode("HK-031").isEmpty()
                && countryRepository.findByCode("HK").isPresent()) {
            Vehicle v = new Vehicle();
            v.setCode("HK-031");
            v.setKind(VehicleKind.TRAILER);
            v.setPayloadKg(3200);
            v.setStatus(VehicleStatus.ACTIVE);
            basedIn(v, "Hong Kong", "HK");
            Vehicle saved = vehicleRepository.save(v);

            createStall(saved, (short) 1, StallType.STANDARD, (short) 1, StallSide.LEFT, false);
            createStall(saved, (short) 2, StallType.BOX, (short) 1, StallSide.RIGHT, false);
            createStall(saved, (short) 3, StallType.STANDARD, (short) 2, StallSide.LEFT, true);
            createStall(saved, (short) 4, StallType.STANDARD, (short) 2, StallSide.RIGHT, true);
        }
    }

    /**
     * Bases {@code v} in {@code city}, {@code home}, with permits for {@code permits}, and has it run every road corridor those
     * cover.
     */
    private void basedIn(Vehicle v, String city, String home, String... permits) {
        v.setHomeCity(city);
        v.setHomeCountry(countryRepository.findByCode(home).orElseThrow());
        for (String code : permits) {
            countryRepository
                    .findByCode(code)
                    .ifPresent(c -> v.getPermittedCountries().add(c));
        }
        for (Corridor corridor : corridorRepository.findAll()) {
            if (corridor.isRoad() && v.refusalToRun(corridor).isEmpty()) {
                v.getOperatingCorridors().add(corridor);
            }
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
        // The demo job is seeded once per database: an existing CBRT counter means it was seeded before,
        // so a demo job someone deleted on purpose stays deleted across restarts.
        boolean seededBefore = codeCounterRepository
                .findByPrefixAndYear(CodePrefix.CBRT, (short) 2026)
                .isPresent();
        advanceCodeCounter(CodePrefix.REQ, (short) 2026, 193);
        advanceCodeCounter(CodePrefix.Q, (short) 2026, 188);
        advanceCodeCounter(CodePrefix.CBRT, (short) 2026, 41);

        if (seededBefore || transportJobRepository.findByCode("CBRT-2026-041").isPresent()) {
            return;
        }

        Country vn = countryRepository.findByCode("VN").orElse(null);
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
                .orElseGet(() -> horseSizeClassRepository.findAll().getFirst());

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
        // The team chosen at approval (US-F1-07): Lan owns the documents, Khôi plans the move.
        job.setTransportSpecialist(userRepository.getByEmail("lan.nguyen@equifreight.vn"));
        job.setCoordinator(khoi);
        job.setStage(JobStage.DOCUMENTS);
        job.setDossierStatus(DossierStatus.OPEN);
        job.setTripStatus(TripStatus.NOT_STARTED);
        job.setPlannedDepartureAt(Instant.parse("2026-10-18T06:00:00Z"));
        job.setPlannedArrivalAt(Instant.parse("2026-10-18T12:30:00Z"));
        job.setWindowStart(Instant.parse("2026-10-18T11:00:00Z"));
        job.setWindowEnd(Instant.parse("2026-10-18T14:00:00Z"));
        TransportJob savedJob = transportJobRepository.save(job);

        // Vehicle TX-447, on the job's own trip
        Vehicle tx447 = vehicleRepository.findByCode("TX-447").orElseThrow();
        List<VehicleStall> stalls = vehicleStallRepository.findByVehicleIdOrderByPositionNo(tx447.getId());
        // The demo job's one trip, as the coordinator adds it (US-F3-21): its request's corridor, from the origin.
        Trip trip = jobTrips.startJourney(savedJob, savedReq.getCorridor(), false, yen, savedJob.getApprovedAt());
        trip.setPlannedDepartureAt(savedJob.getPlannedDepartureAt());
        TripVehicle tripVehicle = jobTrips.useVehicle(trip, tx447);

        // Load plan for CBRT-2026-041 (matching Figma demo state: 3 loaded, 1 conflict, 1 to load)
        LoadPlan lp = new LoadPlan();
        lp.setTripVehicle(tripVehicle);
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
        rp.setTrip(trip);
        rp.setVersionNo((short) 1);
        rp.setStatus(RoutePlanStatus.CONFIRMED);
        rp.setDistanceKm(240);
        rp.setDurationMin(390); // 6.5 hours
        rp.setConfirmedBy(khoi);
        rp.setConfirmedAt(Instant.now());
        RoutePlan savedRp = routePlanRepository.save(rp);

        RouteStop s1 = createStop(
                savedRp,
                savedJob,
                (short) 1,
                RouteStopKind.PICKUP,
                origin,
                null,
                Instant.parse("2026-10-18T06:00:00Z"),
                (short) 45,
                "Loading and condition check, logged with photos.");
        RouteStop s2 = createStop(
                savedRp,
                savedJob,
                (short) 2,
                RouteStopKind.BORDER,
                null,
                border,
                Instant.parse("2026-10-18T08:30:00Z"),
                (short) 60,
                "Vietnam export clearance and Cambodia entry. Recorded per leg as Cleared or Held.");
        RouteStop s3 = createStop(
                savedRp,
                savedJob,
                (short) 3,
                RouteStopKind.WELFARE,
                welfare,
                null,
                Instant.parse("2026-10-18T09:30:00Z"),
                (short) 45,
                "45-minute rest, water and hay, welfare check by the escort.");
        RouteStop s4 = createStop(
                savedRp,
                savedJob,
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

        assignCrewMember(tripVehicle, minh, CrewRole.DRIVER);
        assignCrewMember(tripVehicle, hoa, CrewRole.GROOM);
        assignCrewMember(tripVehicle, tuan, CrewRole.GROOM);

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
        req.getHorses().add(rh);
    }

    private void assignStallDirect(LoadPlan plan, VehicleStall stall, Horse horse) {
        LoadPlanStall lps = new LoadPlanStall();
        lps.setLoadPlan(plan);
        lps.setVehicleStall(stall);
        lps.setHorse(horse);
        loadPlanStallRepository.save(lps);
    }

    /** A stop of the seeded job's route; its pickup and delivery name the job. */
    private RouteStop createStop(
            RoutePlan plan,
            TransportJob job,
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
        if (kind == RouteStopKind.PICKUP || kind == RouteStopKind.DELIVERY) s.setJob(job);
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

    private void assignCrewMember(TripVehicle tripVehicle, User user, CrewRole role) {
        CrewAssignment ca = new CrewAssignment();
        ca.setTrip(tripVehicle.getTrip());
        ca.setTripVehicle(tripVehicle);
        ca.setUser(user);
        ca.setCrewRole(role);
        crewAssignmentRepository.save(ca);
    }

    /**
     * The document rules for each country (Flow 2). {@link CatalogSeeder} has already published one version per
     * country carrying only the lead times, and a published version is immutable (catalog_child_guard), so the
     * rules arrive as that catalog's next version, which replaces it. Cambodia also gets a draft on top, the one
     * the regulation catalog screen is drawn with. Idempotent: a database that has any rule is left alone.
     */
    private void seedRegulations() {
        if (regulationRuleRepository.count() > 0) {
            return;
        }

        User lan = userRepository.getByEmail("lan.nguyen@equifreight.vn");
        User yen = userRepository.getByEmail("yen.vu@equifreight.vn");
        User publisher = lan != null ? lan : yen;

        documentTypeRepository.findByCode("PIROPLASMOSIS_TEST").orElseGet(() -> {
            DocumentType dt = new DocumentType();
            dt.setCode("PIROPLASMOSIS_TEST");
            dt.setName("Equine piroplasmosis test result");
            dt.setScope(DocumentScope.PER_HORSE);
            dt.setProvidedBy(DocumentProvider.CUSTOMER);
            dt.setCategory(DocumentCategory.HEALTH);
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

        Instant publishedAt = Instant.parse("2026-09-22T08:00:00Z");
        for (String country : List.of("VN", "KH", "TH", "LA", "MY", "HK")) {
            RegulationCatalog catalog =
                    regulationCatalogRepository.findByCountryCode(country).orElse(null);
            if (catalog == null) continue;
            RegulationVersion current = nextVersion(catalog);
            createRule(current, passport, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
            createRule(current, flu, RegulationRuleKind.BOOSTER_WINDOW, (short) 7, (short) 180, true, null);
            createRule(
                    current,
                    eia,
                    RegulationRuleKind.WINDOW_BEFORE_DEPARTURE,
                    null,
                    (short) 60,
                    true,
                    "Sampled within 60 days of departure");
            createRule(current, health, RegulationRuleKind.WINDOW_BEFORE_DEPARTURE, null, (short) 10, true, null);
            createRule(current, ownership, RegulationRuleKind.PRESENCE_ONLY, null, null, true, null);
            createRule(current, permit, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
            createRule(current, insurance, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
            createRule(current, customs, RegulationRuleKind.PRESENCE_ONLY, null, null, true, "1 per crossing");
            publish(current, publisher, publishedAt);

            if (country.equals("KH")) {
                // Pin the demo job to the rules it will be checked against, then open the draft the screen shows.
                pinDemoJob(current);
                RegulationVersion draft = nextVersion(catalog);
                createRule(draft, passport, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
                createRule(draft, flu, RegulationRuleKind.BOOSTER_WINDOW, (short) 7, (short) 180, true, null);
                createRule(
                        draft,
                        eia,
                        RegulationRuleKind.WINDOW_BEFORE_DEPARTURE,
                        null,
                        (short) 45,
                        true,
                        "Sampled within 45 days of departure (GDAHP notice 14/2026)");
                createRule(draft, health, RegulationRuleKind.WINDOW_BEFORE_DEPARTURE, null, (short) 10, true, null);
                createRule(draft, ownership, RegulationRuleKind.PRESENCE_ONLY, null, null, true, null);
                createRule(draft, permit, RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS, null, (short) 2, true, null);
                createRule(
                        draft,
                        insurance,
                        RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS,
                        null,
                        (short) 2,
                        false,
                        "Changed to optional recommendation.");
                createRule(draft, customs, RegulationRuleKind.PRESENCE_ONLY, null, null, true, "1 per crossing");
            }
            log.info("Seeded the {} regulation rules as v{}", catalog.getName(), current.getVersionNo());
        }
    }

    /** A new draft after the catalog's newest version, carrying the published version's day counts. */
    private RegulationVersion nextVersion(RegulationCatalog catalog) {
        List<RegulationVersion> published =
                regulationVersionRepository.findByCatalogIdAndStatusOrdered(catalog.getId(), CatalogStatus.PUBLISHED);
        int newest = regulationVersionRepository.findByCatalogId(catalog.getId()).stream()
                .mapToInt(RegulationVersion::getVersionNo)
                .max()
                .orElse(0);
        RegulationVersion base = published.isEmpty() ? null : published.getFirst();
        return createVersion(
                catalog,
                newest + 1,
                CatalogStatus.DRAFT,
                base == null ? (short) 21 : base.getLeadTimeDays(),
                base == null ? (short) 7 : base.getQuarantineMinDays(),
                base == null ? (short) 2 : base.getArrivalBufferDays());
    }

    /** Publishes the draft and retires the version it replaces, as RegulationService.publishVersion does. */
    private void publish(RegulationVersion draft, User publisher, Instant at) {
        for (RegulationVersion old : regulationVersionRepository.findByCatalogIdAndStatusOrdered(
                draft.getCatalog().getId(), CatalogStatus.PUBLISHED)) {
            old.setStatus(CatalogStatus.RETIRED);
            regulationVersionRepository.saveAndFlush(old);
        }
        draft.setStatus(CatalogStatus.PUBLISHED);
        draft.setPublishedAt(at);
        draft.setPublishedBy(publisher);
        regulationVersionRepository.saveAndFlush(draft);
    }

    private void pinDemoJob(RegulationVersion version) {
        transportJobRepository.findByCode("CBRT-2026-041").ifPresent(job -> {
            JobRegulationPin pin = new JobRegulationPin();
            pin.setJob(job);
            pin.setRegulationVersion(version);
            pin.setRole(RegulationRole.DESTINATION);
            jobRegulationPinRepository.save(pin);
        });
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
        if (docType == null) return; // a document type the catalog seed didn't create
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

    /**
     * Hong Kong's authorities and a quarantine station, so a move to Sha Tin can file its import permit and customs
     * dossier, and schedule a post-arrival quarantine. Added by name on every start, so a database seeded before
     * them gets them too.
     */
    private void seedHongKongAuthorities() {
        if (countryRepository.findByCode("HK").isEmpty()) return;
        createAuthority(
                "Agriculture, Fisheries and Conservation Department (AFCD)", "HK", AuthorityKind.VETERINARY, (short) 7);
        createAuthority("Customs and Excise Department, Hong Kong", "HK", AuthorityKind.CUSTOMS, (short) 2);
        createAuthority("Hong Kong Equine Quarantine Station", "HK", AuthorityKind.QUARANTINE, (short) 1);
        createPlaceIfMissing(
                "Hong Kong Equine Quarantine Station",
                PlaceKind.QUARANTINE,
                "Hong Kong",
                "HK",
                "New Territories, Hong Kong");
    }

    private void createAuthority(String name, String countryCode, AuthorityKind kind, short slaDays) {
        if (authorityRepository.findByName(name).isPresent()) {
            return;
        }
        Authority a = new Authority();
        a.setName(name);
        a.setCountry(countryRepository.findByCode(countryCode).orElse(null));
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
        p.setCountry(countryRepository.findByCode(countryCode).orElse(null));
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

        // 0. Seed canonical checklist items and document versions for CBRT-2026-041
        if (checklistItemRepository.findByJobId(job.getId()).isEmpty()) {
            DocumentType passport =
                    documentTypeRepository.findByCode("EQUINE_PASSPORT").orElse(null);
            DocumentType flu =
                    documentTypeRepository.findByCode("INFLUENZA_VACCINATION").orElse(null);
            DocumentType eia = documentTypeRepository.findByCode("EIA_TEST").orElse(null);
            DocumentType ownership =
                    documentTypeRepository.findByCode("PROOF_OF_OWNERSHIP").orElse(null);
            DocumentType insurance =
                    documentTypeRepository.findByCode("TRANSIT_INSURANCE").orElse(null);

            Horse copperKing = horseRepository.findByName("Copper King").orElse(null);

            StoredFile savedPassportFile =
                    seedDemoPdf("demo/passport-copper-king.pdf", "Passport-CopperKing.pdf", customer);
            StoredFile savedOwnershipFile =
                    seedDemoPdf("demo/bill-of-sale-copper-king.pdf", "BillOfSale-CopperKing.pdf", customer);

            if (eia != null && copperKing != null) {
                ChecklistItem ciEia = new ChecklistItem();
                ciEia.setJob(job);
                ciEia.setDocumentType(eia);
                ciEia.setHorse(copperKing);
                ciEia.setStatus(ChecklistStatus.AWAITING_UPLOAD);
                ciEia.setValidity(Validity.RED);
                ciEia.setValidityNote("Valid today, but 77 days old at departure (limit 60 days).");
                ciEia.setHolder(ChecklistHolder.CUSTOMER);
                ciEia.setDueDate(LocalDate.parse("2026-10-04"));
                checklistItemRepository.save(ciEia);
            }

            if (ownership != null && copperKing != null) {
                ChecklistItem ciOwnership = new ChecklistItem();
                ciOwnership.setJob(job);
                ciOwnership.setDocumentType(ownership);
                ciOwnership.setHorse(copperKing);
                ciOwnership.setStatus(ChecklistStatus.REJECTED);
                ciOwnership.setValidity(Validity.RED);
                ciOwnership.setValidityNote("Rejected 24 Sep by Lan: bill of sale is unsigned. Upload signed copy.");
                ciOwnership.setHolder(ChecklistHolder.CUSTOMER);
                ciOwnership.setDueDate(LocalDate.parse("2026-09-25"));
                ChecklistItem savedOwnership = checklistItemRepository.save(ciOwnership);

                DocumentVersion vOwnership = new DocumentVersion();
                vOwnership.setChecklistItem(savedOwnership);
                vOwnership.setVersionNo((short) 1);
                vOwnership.setFile(savedOwnershipFile);
                vOwnership.setUploadedBy(customer);
                vOwnership.setUploadedAt(Instant.now().minus(java.time.Duration.ofDays(26)));
                vOwnership.setReview(DocumentReview.REJECTED);
                vOwnership.setReviewedBy(lan != null ? lan : yen);
                vOwnership.setReviewedAt(Instant.now().minus(java.time.Duration.ofDays(25)));
                vOwnership.setRejectReason("Bill of sale is unsigned. Upload signed copy.");
                DocumentVersion savedVOwnership = documentVersionRepository.save(vOwnership);
                savedOwnership.setCurrentVersion(savedVOwnership);
                checklistItemRepository.save(savedOwnership);
            }

            if (insurance != null) {
                ChecklistItem ciInsurance = new ChecklistItem();
                ciInsurance.setJob(job);
                ciInsurance.setDocumentType(insurance);
                ciInsurance.setStatus(ChecklistStatus.AWAITING_UPLOAD);
                ciInsurance.setValidity(Validity.AMBER);
                ciInsurance.setValidityNote("Policy ends 15 Oct, before arrival plus 2 days (20 Oct).");
                ciInsurance.setHolder(ChecklistHolder.CUSTOMER);
                ciInsurance.setDueDate(LocalDate.parse("2026-09-30"));
                checklistItemRepository.save(ciInsurance);
            }

            if (flu != null && copperKing != null) {
                ChecklistItem ciFlu = new ChecklistItem();
                ciFlu.setJob(job);
                ciFlu.setDocumentType(flu);
                ciFlu.setHorse(copperKing);
                ciFlu.setStatus(ChecklistStatus.AWAITING_UPLOAD);
                ciFlu.setValidity(Validity.RED);
                ciFlu.setValidityNote("Booster lapsed on 16 Sep. Give new booster at least 7 days before departure.");
                ciFlu.setHolder(ChecklistHolder.CUSTOMER);
                ciFlu.setDueDate(LocalDate.parse("2026-10-11"));
                checklistItemRepository.save(ciFlu);
            }

            if (passport != null && copperKing != null) {
                ChecklistItem ciPassport = new ChecklistItem();
                ciPassport.setJob(job);
                ciPassport.setDocumentType(passport);
                ciPassport.setHorse(copperKing);
                ciPassport.setStatus(ChecklistStatus.IN_REVIEW);
                ciPassport.setValidity(Validity.GREEN);
                ciPassport.setValidityNote("Passport uploaded and valid. Awaiting specialist verification.");
                ciPassport.setHolder(ChecklistHolder.SPECIALIST);
                ciPassport.setDueDate(LocalDate.parse("2026-10-15"));
                ChecklistItem savedPassport = checklistItemRepository.save(ciPassport);

                DocumentVersion vPassport = new DocumentVersion();
                vPassport.setChecklistItem(savedPassport);
                vPassport.setVersionNo((short) 1);
                vPassport.setFile(savedPassportFile);
                vPassport.setUploadedBy(customer);
                vPassport.setUploadedAt(Instant.now().minus(java.time.Duration.ofDays(2)));
                vPassport.setReview(DocumentReview.PENDING);
                DocumentVersion savedVPassport = documentVersionRepository.save(vPassport);
                savedPassport.setCurrentVersion(savedVPassport);
                checklistItemRepository.save(savedPassport);
            }

            log.info("Seeded canonical checklist items and versions for CBRT-2026-041");
        }

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
            n1.setRoutedRole(NoteTopic.DOCUMENTS.routedRole());
            n1.setCreatedBy(customer);
            n1.setSubject("Equine Influenza vaccination window");
            n1.setBody(
                    "Copper King's EI booster is scheduled for 10 Oct at the club clinic. Can we submit the updated veterinary record 7 days before departure instead of the required 14 days?");
            n1.setStatus(NoteStatus.ANSWERED);
            n1.setAttachedFile(seedDemoPdf(
                    "demo/ei-booster-schedule-copper-king.pdf", "EI-Booster-Schedule-CopperKing.pdf", customer));
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
            n2.setRoutedRole(NoteTopic.TRIP.routedRole());
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
        CodeCounter counter = codeCounterRepository
                .findByPrefixAndYear(prefix, year)
                .orElseGet(() -> {
                    CodeCounter c = new CodeCounter();
                    c.setPrefix(prefix);
                    c.setYear(year);
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

    private record SizeClass(String code, int widthIn, String minHeightHh) {}

    private record DocType(String code, String name, DocumentScope scope, DocumentProvider providedBy) {
        /** What the document is about; the health documents decide a horse's health status (US-F3-12). */
        DocumentCategory category() {
            return switch (code) {
                case "INFLUENZA_VACCINATION", "EIA_TEST", "PIROPLASMOSIS_TEST", "EXPORT_HEALTH_CERT" ->
                    DocumentCategory.HEALTH;
                case "EQUINE_PASSPORT", "PROOF_OF_OWNERSHIP" -> DocumentCategory.IDENTITY;
                case "IMPORT_PERMIT" -> DocumentCategory.PERMIT;
                default -> DocumentCategory.TRANSPORT;
            };
        }
    }

    /**
     * A one-page PDF named after the document, stored for real so the demo version opens like an upload. If the
     * store is down the row is still seeded; opening it then fails like any missing file.
     */
    private StoredFile seedDemoPdf(String key, String fileName, User uploadedBy) {
        String text = fileName.replace("(", "").replace(")", "");
        String stream = "BT /F1 18 Tf 72 720 Td (" + text + ") Tj ET";
        String pdf = "%PDF-1.4\n"
                + "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
                + "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
                + "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R"
                + " /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
                + "4 0 obj << /Length " + stream.length() + " >> stream\n" + stream + "\nendstream endobj\n"
                + "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
                + "trailer << /Root 1 0 R >>\n%%EOF\n";
        byte[] bytes = pdf.getBytes(StandardCharsets.US_ASCII);
        try {
            fileStorage.put(key, new ByteArrayResource(bytes), bytes.length, "application/pdf");
        } catch (StorageException e) {
            log.warn("Demo file {} was not stored: {}", key, e.getMessage());
        }
        StoredFile file = new StoredFile();
        file.setStorageKey(key);
        file.setFileName(fileName);
        file.setContentType("application/pdf");
        file.setSizeBytes(bytes.length);
        file.setSha256(sha256(bytes));
        file.setUploadedBy(uploadedBy);
        return storedFileRepository.save(file);
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is always available", e);
        }
    }
}
