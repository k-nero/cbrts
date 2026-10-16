package com.equifreight.configuration;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.RegulationCatalog;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.repository.BorderCrossingRepository;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RegulationCatalogRepository;
import com.equifreight.repository.RegulationVersionRepository;
import com.equifreight.repository.UserRepository;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The demo route catalog (spec §7): pickup and delivery places, border crossings, the corridors we run and one
 * published regulation version per country, carrying the lead times (BR-F1-01) but no document rules; Flow 2
 * adds those as the next version. Every value is a demo placeholder. Idempotent by natural key: a row that
 * exists is left alone. Called by {@link DataSeeder} after the accounts exist.
 */
@Component
@Log4j2
public class CatalogSeeder {

    private record DemoPlace(String name, PlaceKind kind, String city, String country) {}

    private record DemoCrossing(String name, String from, String to) {}

    private record DemoCorridor(String code, TransportMode mode, String from, String to, int km,
                                List<String> crossings) {}

    private record DemoRegulation(String country, int versionNo, int leadTimeDays) {}

    private static final List<DemoPlace> PLACES = List.of(
            new DemoPlace("Phú Thọ training centre", PlaceKind.TRAINING_CENTRE, "Ho Chi Minh City", "VN"),
            new DemoPlace("Sóc Sơn quarantine station", PlaceKind.QUARANTINE, "Hanoi", "VN"),
            new DemoPlace("Phnom Penh Equestrian Centre", PlaceKind.STABLE, "Phnom Penh", "KH"),
            new DemoPlace("Chao Phraya Racing Stables", PlaceKind.STABLE, "Bangkok", "TH"),
            new DemoPlace("Vientiane racing stables", PlaceKind.STABLE, "Vientiane", "LA"),
            new DemoPlace("Kuala Lumpur equestrian centre", PlaceKind.STABLE, "Kuala Lumpur", "MY"),
            new DemoPlace("Sha Tin stables", PlaceKind.STABLE, "Hong Kong", "HK"));

    private static final List<DemoCrossing> CROSSINGS = List.of(
            new DemoCrossing("Mộc Bài – Bavet", "VN", "KH"),
            new DemoCrossing("Poipet – Aranyaprathet", "KH", "TH"),
            new DemoCrossing("Nong Khai – Vientiane", "TH", "LA"),
            new DemoCrossing("Sadao – Bukit Kayu Hitam", "TH", "MY"),
            new DemoCrossing("Cầu Treo – Nam Phao", "VN", "LA"));

    private static final List<DemoCorridor> CORRIDORS = List.of(
            new DemoCorridor("RD HCM → PNH", TransportMode.ROAD, "Ho Chi Minh City", "Phnom Penh", 230,
                    List.of("Mộc Bài – Bavet")),
            new DemoCorridor("RD HCM → BKK", TransportMode.ROAD, "Ho Chi Minh City", "Bangkok", 960,
                    List.of("Mộc Bài – Bavet", "Poipet – Aranyaprathet")),
            new DemoCorridor("RD PNH → BKK", TransportMode.ROAD, "Phnom Penh", "Bangkok", 660,
                    List.of("Poipet – Aranyaprathet")),
            new DemoCorridor("RD BKK → VTE", TransportMode.ROAD, "Bangkok", "Vientiane", 640,
                    List.of("Nong Khai – Vientiane")),
            new DemoCorridor("RD BKK → KUL", TransportMode.ROAD, "Bangkok", "Kuala Lumpur", 1450,
                    List.of("Sadao – Bukit Kayu Hitam")),
            new DemoCorridor("RD HAN → VTE", TransportMode.ROAD, "Hanoi", "Vientiane", 780,
                    List.of("Cầu Treo – Nam Phao")),
            new DemoCorridor("RD HCM → HAN", TransportMode.ROAD, "Ho Chi Minh City", "Hanoi", 1700, List.of()),
            new DemoCorridor("AIR PNH → HKG", TransportMode.AIR, "Phnom Penh", "Hong Kong", 1550, List.of()),
            new DemoCorridor("AIR SGN → HKG", TransportMode.AIR, "Ho Chi Minh City", "Hong Kong", 1500, List.of()));

    /** The frames' version numbers; Laos needs 30 days (Request review · Override). */
    private static final List<DemoRegulation> REGULATIONS = List.of(
            new DemoRegulation("VN", 5, 21),
            new DemoRegulation("KH", 7, 21),
            new DemoRegulation("TH", 4, 21),
            new DemoRegulation("LA", 3, 30),
            new DemoRegulation("MY", 1, 21),
            new DemoRegulation("HK", 1, 21));

    private static final short DOMESTIC_LEAD_TIME_DAYS = 3;
    private static final short QUARANTINE_MIN_DAYS = 7;
    private static final short ARRIVAL_BUFFER_DAYS = 2;
    private static final String PUBLISHER = "lan.nguyen@equifreight.vn";
    private static final Instant PUBLISHED_AT = LocalDate.of(2026, 9, 1).atStartOfDay(BusinessTime.ZONE).toInstant();

    private final PlaceRepository places;
    private final BorderCrossingRepository crossings;
    private final CorridorRepository corridors;
    private final CountryRepository countries;
    private final RegulationCatalogRepository catalogs;
    private final RegulationVersionRepository versions;
    private final UserRepository users;

    public CatalogSeeder(PlaceRepository places, BorderCrossingRepository crossings, CorridorRepository corridors,
                         CountryRepository countries, RegulationCatalogRepository catalogs,
                         RegulationVersionRepository versions, UserRepository users) {
        this.places = places;
        this.crossings = crossings;
        this.corridors = corridors;
        this.countries = countries;
        this.catalogs = catalogs;
        this.versions = versions;
        this.users = users;
    }

    public void seed() {
        for (DemoPlace demo : PLACES) {
            if (places.findByName(demo.name()).isEmpty()) {
                Place place = new Place();
                place.setName(demo.name());
                place.setKind(demo.kind());
                place.setCity(demo.city());
                place.setCountry(country(demo.country()));
                places.save(place);
                log.info("Seeded place {}", demo.name());
            }
        }
        Map<String, BorderCrossing> crossingsByName = new HashMap<>();
        for (DemoCrossing demo : CROSSINGS) {
            crossingsByName.put(demo.name(), crossings.findByName(demo.name()).orElseGet(() -> {
                BorderCrossing crossing = new BorderCrossing();
                crossing.setName(demo.name());
                crossing.setFromCountry(country(demo.from()));
                crossing.setToCountry(country(demo.to()));
                log.info("Seeded border crossing {}", demo.name());
                return crossings.save(crossing);
            }));
        }
        for (DemoCorridor demo : CORRIDORS) {
            if (corridors.findByCode(demo.code()).isPresent()) {
                continue;
            }
            // Another seeder may have run the same route under another code (Flow 3's "RD HCM -> PNH"):
            // reuse it, and give it the crossings it lacks, rather than add a second corridor.
            Optional<Corridor> sameRoute = corridors.findBetweenCities(demo.from(), demo.to()).stream()
                    .filter(c -> c.getMode() == demo.mode() && c.getOriginCity().equalsIgnoreCase(demo.from()))
                    .findFirst();
            if (sameRoute.isEmpty()) {
                corridors.save(corridor(demo, crossingsByName));
                log.info("Seeded corridor {}", demo.code());
            } else if (sameRoute.get().getCrossings().isEmpty() && !demo.crossings().isEmpty()) {
                link(sameRoute.get(), demo, crossingsByName);
                corridors.save(sameRoute.get());
                log.info("Linked the crossings of corridor {}", sameRoute.get().getCode());
            }
        }
        for (DemoRegulation demo : REGULATIONS) {
            seedRegulation(demo);
        }
    }

    private static Corridor corridor(DemoCorridor demo, Map<String, BorderCrossing> crossingsByName) {
        Corridor corridor = new Corridor();
        corridor.setCode(demo.code());
        corridor.setMode(demo.mode());
        corridor.setOriginCity(demo.from());
        corridor.setDestinationCity(demo.to());
        corridor.setDistanceKm(demo.km());
        link(corridor, demo, crossingsByName);
        return corridor;
    }

    private static void link(Corridor corridor, DemoCorridor demo, Map<String, BorderCrossing> crossingsByName) {
        for (int i = 0; i < demo.crossings().size(); i++) {
            String name = demo.crossings().get(i);
            CorridorCrossing link = new CorridorCrossing();
            link.getId().setSeq((short) (i + 1));
            link.setCorridor(corridor);
            link.setBorderCrossing(crossingsByName.get(name));
            corridor.getCrossings().add(link);
        }
    }

    private void seedRegulation(DemoRegulation demo) {
        RegulationCatalog catalog = catalogs.findByCountryCode(demo.country()).orElseGet(() -> {
            Country country = country(demo.country());
            RegulationCatalog created = new RegulationCatalog();
            created.setCountry(country);
            created.setName(country.getName() + " import");
            log.info("Seeded regulation catalog {}", created.getName());
            return catalogs.save(created);
        });
        if (!versions.findByCatalogId(catalog.getId()).isEmpty()) {
            return;
        }
        RegulationVersion version = new RegulationVersion();
        version.setCatalog(catalog);
        version.setVersionNo(demo.versionNo());
        version.setStatus(CatalogStatus.PUBLISHED);
        version.setPublishedAt(PUBLISHED_AT);
        version.setPublishedBy(users.getByEmail(PUBLISHER));
        version.setLeadTimeDays((short) demo.leadTimeDays());
        version.setDomesticLeadTimeDays(DOMESTIC_LEAD_TIME_DAYS);
        version.setQuarantineMinDays(QUARANTINE_MIN_DAYS);
        version.setArrivalBufferDays(ARRIVAL_BUFFER_DAYS);
        versions.save(version);
        log.info("Seeded regulation version {} v{}", demo.country(), demo.versionNo());
    }

    private Country country(String code) {
        return countries.getReferenceById(code);
    }
}
