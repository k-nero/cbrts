package com.equifreight.configuration;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.repository.*;
import com.equifreight.service.HorseSizing;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
 * Seeds the reference data and accounts: countries, size classes, document types, roles and one account per role,
 * the customer's club and its four horses (docs/figma-plugin/src/03-pages.js, HORSES) with their full passport
 * identity, the route catalog ({@link CatalogSeeder}), the fleet, each country's document rules and its authorities.
 * No request or job is seeded: the demo makes them through the app. Idempotent: existing records are preserved.
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

    private static final List<DemoAuthority> AUTHORITIES = List.of(
            new DemoAuthority("Regional Animal Health Office No. VI (RAHO6)", "VN", AuthorityKind.VETERINARY, 5),
            new DemoAuthority("Tân Sơn Nhất Airport Customs Branch", "VN", AuthorityKind.CUSTOMS, 2),
            new DemoAuthority("Mộc Bài Customs Sub-Department", "VN", AuthorityKind.CUSTOMS, 2),
            new DemoAuthority(
                    "General Directorate of Animal Health and Production (GDAHP)", "KH", AuthorityKind.VETERINARY, 4),
            new DemoAuthority("Bavet International Border Customs", "KH", AuthorityKind.CUSTOMS, 2),
            new DemoAuthority("Department of Livestock Development (DLD)", "TH", AuthorityKind.VETERINARY, 5),
            new DemoAuthority("Thai Customs Department", "TH", AuthorityKind.CUSTOMS, 2),
            new DemoAuthority("Department of Livestock and Fisheries (DLF)", "LA", AuthorityKind.VETERINARY, 7),
            new DemoAuthority("Lao Customs Department", "LA", AuthorityKind.CUSTOMS, 3),
            new DemoAuthority("Department of Veterinary Services (DVS)", "MY", AuthorityKind.VETERINARY, 5),
            new DemoAuthority("Royal Malaysian Customs Department", "MY", AuthorityKind.CUSTOMS, 2),
            new DemoAuthority(
                    "Agriculture, Fisheries and Conservation Department (AFCD)", "HK", AuthorityKind.VETERINARY, 7),
            new DemoAuthority("Customs and Excise Department, Hong Kong", "HK", AuthorityKind.CUSTOMS, 2));

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
    private final CorridorRepository corridorRepository;
    private final ClubRepository clubRepository;
    private final HorseSizeClassRepository horseSizeClassRepository;
    private final HorseRepository horseRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleStallRepository vehicleStallRepository;
    private final RegulationCatalogRepository regulationCatalogRepository;
    private final RegulationVersionRepository regulationVersionRepository;
    private final RegulationRuleRepository regulationRuleRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final AuthorityRepository authorityRepository;
    private final CatalogSeeder catalogSeeder;

    public DataSeeder(
            RoleRepository roleRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.default.password}") String seedPassword,
            CountryRepository countryRepository,
            CorridorRepository corridorRepository,
            ClubRepository clubRepository,
            HorseSizeClassRepository horseSizeClassRepository,
            HorseRepository horseRepository,
            VehicleRepository vehicleRepository,
            VehicleStallRepository vehicleStallRepository,
            RegulationCatalogRepository regulationCatalogRepository,
            RegulationVersionRepository regulationVersionRepository,
            RegulationRuleRepository regulationRuleRepository,
            DocumentTypeRepository documentTypeRepository,
            AuthorityRepository authorityRepository,
            CatalogSeeder catalogSeeder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedPassword = seedPassword;
        this.countryRepository = countryRepository;
        this.corridorRepository = corridorRepository;
        this.clubRepository = clubRepository;
        this.horseSizeClassRepository = horseSizeClassRepository;
        this.horseRepository = horseRepository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleStallRepository = vehicleStallRepository;
        this.regulationCatalogRepository = regulationCatalogRepository;
        this.regulationVersionRepository = regulationVersionRepository;
        this.regulationRuleRepository = regulationRuleRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.authorityRepository = authorityRepository;
        this.catalogSeeder = catalogSeeder;
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
        // After the accounts: the regulation versions name their publisher.
        catalogSeeder.seed();
        seedVehicles();
        seedRegulations();
        seedAuthorities();
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
                // The draft the regulation catalog screen is drawn with.
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

    /**
     * The veterinary and customs authority of every country we serve, real bodies. Added by name on every start, so a
     * database seeded before one of them gets it too. Their SLA days are demo values.
     */
    private void seedAuthorities() {
        for (DemoAuthority a : AUTHORITIES) {
            if (countryRepository.findByCode(a.country()).isPresent()) {
                createAuthority(a.name(), a.country(), a.kind(), (short) a.slaDays());
            }
        }
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

    private record DemoAuthority(String name, String country, AuthorityKind kind, int slaDays) {}

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
}
