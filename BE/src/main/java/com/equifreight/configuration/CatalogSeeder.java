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
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

/**
 * The route catalog the demo runs on (spec §7): pickup and delivery places, border crossings, the corridors we run and
 * one published regulation version per country, carrying the lead times (BR-F1-01) but no document rules; Flow 2 adds
 * those as the next version. The venues, terminals, crossings and distances are real; the stables and isolation barns
 * named inside a venue, and every day count and figure, are demo values. Idempotent by natural key: a row that exists
 * is left alone. Called by {@link DataSeeder} after the accounts exist.
 */
@Component
@Log4j2
public class CatalogSeeder {

    private record DemoPlace(String name, PlaceKind kind, String city, String country, String address) {}

    private record DemoCrossing(String name, String from, String to) {}

    /** {@code fromCountry} and {@code toCountry} are the two ends' country codes (US-F7-01). */
    private record DemoCorridor(
            String code,
            TransportMode mode,
            String from,
            String to,
            int km,
            List<String> crossings,
            String fromCountry,
            String toCountry) {}

    /** {@code quarantineMinDays}: the shortest quarantine the country takes a horse in from (BR-F2-06). */
    private record DemoRegulation(String country, int versionNo, int leadTimeDays, int quarantineMinDays) {}

    private static final List<DemoPlace> PLACES = List.of(
            // Đại Nam's racecourse in Thủ Dầu Một, part of Ho Chi Minh City since Bình Dương merged into it (2025).
            new DemoPlace(
                    "Đại Nam Racecourse",
                    PlaceKind.TRAINING_CENTRE,
                    "Ho Chi Minh City",
                    "VN",
                    "Đại Nam Wonderland, Đại lộ Bình Dương, Thủ Dầu Một"),
            // Pre-export isolation is held at premises the exporting country's official vet approves, usually the
            // horses' own yard: RAHO6 approves this barn for each shipment.
            new DemoPlace(
                    "Đại Nam Racecourse isolation barn",
                    PlaceKind.QUARANTINE,
                    "Ho Chi Minh City",
                    "VN",
                    "Đại Nam Wonderland, Đại lộ Bình Dương, Thủ Dầu Một"),
            new DemoPlace(
                    "Genius Resort Equestrian Centre",
                    PlaceKind.STABLE,
                    "Phnom Penh",
                    "KH",
                    "Northbridge Street, Sen Sok, Phnom Penh"),
            new DemoPlace(
                    "Svay Rieng welfare stop",
                    PlaceKind.WELFARE_STOP,
                    "Svay Rieng",
                    "KH",
                    "National Road 1, Svay Rieng"),
            new DemoPlace(
                    "Royal Bangkok Sports Club",
                    PlaceKind.STABLE,
                    "Bangkok",
                    "TH",
                    "1 Henri Dunant Road, Pathum Wan, Bangkok"),
            new DemoPlace(
                    "Selangor Turf Club", PlaceKind.STABLE, "Kuala Lumpur", "MY", "Jalan Sungai Besi, Kuala Lumpur"),
            // In Sha Tin, not Hong Kong: a flight lands at HKG, so the move to the stables is the road leg
            // "RD HKG → Sha Tin" (US-F1-09), not the flight's own end.
            new DemoPlace(
                    "Sha Tin Racecourse stables (HKJC)",
                    PlaceKind.STABLE,
                    "Sha Tin",
                    "HK",
                    "Sha Tin Racecourse, Sha Tin, New Territories"),
            // AFCD: imported horses serve their post-arrival quarantine at the Jockey Club's facilities, the only ones.
            new DemoPlace(
                    "HKJC import quarantine stables",
                    PlaceKind.QUARANTINE,
                    "Sha Tin",
                    "HK",
                    "Sha Tin Racecourse, Sha Tin, New Territories"),
            // Where a journey of several trips changes carrier (US-F3-16): road to the airport, the flight, road again.
            new DemoPlace(
                    "TCS cargo terminal, Tân Sơn Nhất (SGN)",
                    PlaceKind.AIRPORT,
                    "Ho Chi Minh City",
                    "VN",
                    "46-48 Hậu Giang, Tân Sơn Nhất Airport"),
            new DemoPlace(
                    "Techo International Airport cargo terminal (PNH)",
                    PlaceKind.AIRPORT,
                    "Phnom Penh",
                    "KH",
                    "Techo International Airport, Kandal"),
            new DemoPlace(
                    "Cathay Cargo Terminal (HKG)",
                    PlaceKind.AIRPORT,
                    "Hong Kong",
                    "HK",
                    "Hong Kong International Airport, Chek Lap Kok"));

    private static final List<DemoCrossing> CROSSINGS = List.of(
            new DemoCrossing("Mộc Bài – Bavet", "VN", "KH"),
            new DemoCrossing("Poipet – Aranyaprathet", "KH", "TH"),
            new DemoCrossing("Nong Khai – Vientiane", "TH", "LA"),
            new DemoCrossing("Sadao – Bukit Kayu Hitam", "TH", "MY"),
            new DemoCrossing("Cầu Treo – Nam Phao", "VN", "LA"));

    private static final List<DemoCorridor> CORRIDORS = List.of(
            new DemoCorridor(
                    "RD HCM → PNH",
                    TransportMode.ROAD,
                    "Ho Chi Minh City",
                    "Phnom Penh",
                    230,
                    List.of("Mộc Bài – Bavet"),
                    "VN",
                    "KH"),
            new DemoCorridor(
                    "RD HCM → BKK",
                    TransportMode.ROAD,
                    "Ho Chi Minh City",
                    "Bangkok",
                    960,
                    List.of("Mộc Bài – Bavet", "Poipet – Aranyaprathet"),
                    "VN",
                    "TH"),
            new DemoCorridor(
                    "RD PNH → BKK",
                    TransportMode.ROAD,
                    "Phnom Penh",
                    "Bangkok",
                    660,
                    List.of("Poipet – Aranyaprathet"),
                    "KH",
                    "TH"),
            new DemoCorridor(
                    "RD BKK → VTE",
                    TransportMode.ROAD,
                    "Bangkok",
                    "Vientiane",
                    640,
                    List.of("Nong Khai – Vientiane"),
                    "TH",
                    "LA"),
            new DemoCorridor(
                    "RD BKK → KUL",
                    TransportMode.ROAD,
                    "Bangkok",
                    "Kuala Lumpur",
                    1450,
                    List.of("Sadao – Bukit Kayu Hitam"),
                    "TH",
                    "MY"),
            new DemoCorridor(
                    "RD HAN → VTE",
                    TransportMode.ROAD,
                    "Hanoi",
                    "Vientiane",
                    780,
                    List.of("Cầu Treo – Nam Phao"),
                    "VN",
                    "LA"),
            new DemoCorridor(
                    "RD HCM → HAN", TransportMode.ROAD, "Ho Chi Minh City", "Hanoi", 1700, List.of(), "VN", "VN"),
            // The domestic leg to the hub: Da Nang → Hong Kong goes by road to Ho Chi Minh City, then flies (US-F1-09).
            new DemoCorridor(
                    "RD DAD → HCM", TransportMode.ROAD, "Da Nang", "Ho Chi Minh City", 960, List.of(), "VN", "VN"),
            new DemoCorridor(
                    "AIR PNH → HKG", TransportMode.AIR, "Phnom Penh", "Hong Kong", 1550, List.of(), "KH", "HK"),
            new DemoCorridor(
                    "AIR SGN → HKG", TransportMode.AIR, "Ho Chi Minh City", "Hong Kong", 1500, List.of(), "VN", "HK"),
            // The road trip after the flight, from Hong Kong airport to the stables (US-F3-16).
            new DemoCorridor("RD HKG → Sha Tin", TransportMode.ROAD, "Hong Kong", "Sha Tin", 40, List.of(), "HK", "HK"),
            // Local runs within a city, between a stable and the airport's cargo terminal, around a flight.
            new DemoCorridor(
                    "RD HCM local",
                    TransportMode.ROAD,
                    "Ho Chi Minh City",
                    "Ho Chi Minh City",
                    40,
                    List.of(),
                    "VN",
                    "VN"),
            new DemoCorridor("RD PNH local", TransportMode.ROAD, "Phnom Penh", "Phnom Penh", 45, List.of(), "KH", "KH"),
            new DemoCorridor("RD HKG local", TransportMode.ROAD, "Hong Kong", "Hong Kong", 35, List.of(), "HK", "HK"));

    /**
     * The frames' version numbers; Laos needs 30 days (Request review · Override). Hong Kong holds an imported horse
     * at least 14 days; the others take a 7-day minimum. Every day count is a demo value.
     */
    private static final List<DemoRegulation> REGULATIONS = List.of(
            new DemoRegulation("VN", 5, 21, 7),
            new DemoRegulation("KH", 7, 21, 7),
            new DemoRegulation("TH", 4, 21, 7),
            new DemoRegulation("LA", 3, 30, 7),
            new DemoRegulation("MY", 1, 21, 7),
            new DemoRegulation("HK", 1, 21, 14));

    private static final short DOMESTIC_LEAD_TIME_DAYS = 3;
    private static final short ARRIVAL_BUFFER_DAYS = 2;
    private static final String PUBLISHER = "lan.nguyen@equifreight.vn";
    private static final Instant PUBLISHED_AT =
            LocalDate.of(2026, 9, 1).atStartOfDay(BusinessTime.ZONE).toInstant();

    private final PlaceRepository places;
    private final BorderCrossingRepository crossings;
    private final CorridorRepository corridors;
    private final CountryRepository countries;
    private final RegulationCatalogRepository catalogs;
    private final RegulationVersionRepository versions;
    private final UserRepository users;

    public CatalogSeeder(
            PlaceRepository places,
            BorderCrossingRepository crossings,
            CorridorRepository corridors,
            CountryRepository countries,
            RegulationCatalogRepository catalogs,
            RegulationVersionRepository versions,
            UserRepository users) {
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
                place.setAddress(demo.address());
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
                crossing.setRoadOnly(true);
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
            } else if (sameRoute.get().getCrossings().isEmpty()
                    && !demo.crossings().isEmpty()) {
                link(sameRoute.get(), demo, crossingsByName);
                corridors.save(sameRoute.get());
                log.info("Linked the crossings of corridor {}", sameRoute.get().getCode());
            }
        }
        for (DemoRegulation demo : REGULATIONS) {
            seedRegulation(demo);
        }
    }

    private Corridor corridor(DemoCorridor demo, Map<String, BorderCrossing> crossingsByName) {
        Corridor corridor = new Corridor();
        corridor.setCode(demo.code());
        corridor.setMode(demo.mode());
        corridor.setOriginCity(demo.from());
        corridor.setDestinationCity(demo.to());
        corridor.setDistanceKm(demo.km());
        corridor.setDrivingDays(Corridor.drivingDaysFor(demo.km()));
        corridor.setOriginCountry(country(demo.fromCountry()));
        corridor.setDestinationCountry(country(demo.toCountry()));
        link(corridor, demo, crossingsByName);
        return corridor;
    }

    private static void link(Corridor corridor, DemoCorridor demo, Map<String, BorderCrossing> crossingsByName) {
        for (int i = 0; i < demo.crossings().size(); i++) {
            String name = demo.crossings().get(i);
            CorridorCrossing link = new CorridorCrossing();
            link.setSeq((short) (i + 1));
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
        version.setQuarantineMinDays((short) demo.quarantineMinDays());
        version.setArrivalBufferDays(ARRIVAL_BUFFER_DAYS);
        versions.save(version);
        log.info("Seeded regulation version {} v{}", demo.country(), demo.versionNo());
    }

    /**
     * The seeded corridors whose countries disagree with their crossings (US-F7-01), one sentence each; empty when
     * the catalog is consistent. A corridor starts where its first crossing leaves and ends where its last one enters,
     * each crossing starts where the previous one ended, and a road corridor without crossings stays in one country.
     */
    static List<String> inconsistentCorridors() {
        Map<String, DemoCrossing> byName = new HashMap<>();
        for (DemoCrossing c : CROSSINGS) byName.put(c.name(), c);
        List<String> problems = new ArrayList<>();
        for (DemoCorridor corridor : CORRIDORS) {
            List<DemoCrossing> route =
                    corridor.crossings().stream().map(byName::get).toList();
            if (route.contains(null)) {
                problems.add(corridor.code() + " names a crossing that isn't seeded.");
                continue;
            }
            if (route.isEmpty()) {
                if (corridor.mode() == TransportMode.ROAD
                        && !corridor.fromCountry().equals(corridor.toCountry())) {
                    problems.add(corridor.code() + " crosses a border by road without a crossing.");
                }
                continue;
            }
            String at = corridor.fromCountry();
            for (DemoCrossing crossing : route) {
                if (!crossing.from().equals(at)) {
                    problems.add(corridor.code() + " reaches " + crossing.name() + " from " + at + ".");
                }
                at = crossing.to();
            }
            if (!at.equals(corridor.toCountry())) {
                problems.add(corridor.code() + " ends in " + at + ", not " + corridor.toCountry() + ".");
            }
        }
        return problems;
    }

    private Country country(String code) {
        return countries
                .findByCode(code)
                .orElseThrow(() -> new IllegalStateException("Country " + code + " is not seeded."));
    }
}
