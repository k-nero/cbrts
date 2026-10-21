package com.equifreight.configuration;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateFeeBand;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.RateVolumeBreak;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.FeeBandKind;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.rate.PublishRequest;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.RateLineRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RateServiceClassRepository;
import com.equifreight.repository.RateVolumeBreakRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.RateCatalogService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.log4j.Log4j2;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The demo rate catalog (spec §5.4), published once. Flow 3's seeder publishes an empty v1 that its demo quotation
 * pins; a published version is immutable, so the rates go into the next version. It runs when the application is
 * ready, after every seeder that creates the corridors and accounts. HAN → VTE deliberately lacks its private-trailer
 * road rate and its crossing fee, so the Rates page and the builder show a corridor that can't be quoted yet. Every
 * figure is a demo value, not a price list.
 */
@Component
@Log4j2
public class RateCatalogSeeder {

    static final String CHANGE_NOTE = "Demo rates for the corridors we run";
    private static final String PUBLISHER = "lan.nguyen@equifreight.vn";

    private static final Map<RatePolicyKey, String> POLICIES = Map.ofEntries(
            Map.entry(RatePolicyKey.FUEL_PCT, "18"),
            Map.entry(RatePolicyKey.INSURANCE_PCT, "1.5"),
            Map.entry(RatePolicyKey.CONTINGENCY_PCT, "5"),
            Map.entry(RatePolicyKey.SERVICE_FEE_PCT, "12"),
            Map.entry(RatePolicyKey.DEPOSIT_PCT, "30"),
            Map.entry(RatePolicyKey.QUOTE_VALIDITY_DAYS, "7"),
            Map.entry(RatePolicyKey.FLIGHT_VET_MIN_HORSES, "8"),
            Map.entry(RatePolicyKey.HIGH_VALUE_THRESHOLD, "250000"),
            Map.entry(RatePolicyKey.ARRIVAL_WINDOW_PCT, "20"),
            Map.entry(RatePolicyKey.ESTIMATE_BAND_PCT, "15"),
            Map.entry(RatePolicyKey.ARRIVAL_WINDOW_MIN_HOURS, "3"),
            Map.entry(RatePolicyKey.LATE_PENALTY_PCT_PER_HOUR, "10"),
            Map.entry(RatePolicyKey.LATE_PENALTY_CAP_PCT, "30"));

    private final RateCatalogVersionRepository versions;
    private final RateLineRepository lines;
    private final RateServiceClassRepository classes;
    private final RateVolumeBreakRepository breaks;
    private final RatePolicyRepository policies;
    private final RateFeeBandRepository feeBands;
    private final CorridorRepository corridors;
    private final UserRepository users;
    private final RateCatalogService catalog;

    public RateCatalogSeeder(
            RateCatalogVersionRepository versions,
            RateLineRepository lines,
            RateServiceClassRepository classes,
            RateVolumeBreakRepository breaks,
            RatePolicyRepository policies,
            RateFeeBandRepository feeBands,
            CorridorRepository corridors,
            UserRepository users,
            RateCatalogService catalog) {
        this.versions = versions;
        this.lines = lines;
        this.classes = classes;
        this.breaks = breaks;
        this.policies = policies;
        this.feeBands = feeBands;
        this.corridors = corridors;
        this.users = users;
        this.catalog = catalog;
    }

    /** Transactional here too: the call to seed() below doesn't pass through the proxy. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void onReady() {
        seed();
    }

    @Transactional
    public void seed() {
        if (lines.existsBy()) {
            return;
        }
        User lan = users.getByEmail(PUBLISHER);
        RateCatalogVersion draft = versions.findByStatus(CatalogStatus.DRAFT).orElseGet(() -> {
            RateCatalogVersion v = new RateCatalogVersion();
            Integer max = versions.maxVersionNo();
            v.setVersionNo((max == null ? 0 : max) + 1);
            v.setStatus(CatalogStatus.DRAFT);
            v.setLastEditedBy(lan);
            return versions.saveAndFlush(v);
        });

        List<RateLine> rateLines = new ArrayList<>(everyCorridorLines(draft));
        List<RateServiceClass> stalls = new ArrayList<>();
        for (Corridor corridor : corridors.findAll()) {
            if (corridor.getMode() == TransportMode.AIR) {
                rateLines.addAll(airLines(draft, corridor));
                for (ServiceClass sc : ServiceClass.values()) {
                    stalls.add(stall(draft, corridor, sc));
                }
            } else {
                rateLines.addAll(roadLines(draft, corridor));
            }
        }
        classes.saveAll(stalls);
        lines.saveAll(rateLines);
        breaks.saveAll(List.of(
                band(draft, 1, 1, "0"), band(draft, 2, 3, "5"), band(draft, 4, 7, "10"), band(draft, 8, null, "15")));
        policies.saveAll(POLICIES.entrySet().stream()
                .map(e -> {
                    RatePolicy p = new RatePolicy();
                    p.setKey(e.getKey());
                    p.setVersion(draft);
                    p.setValue(new BigDecimal(e.getValue()));
                    return p;
                })
                .toList());
        feeBands.saveAll(List.of(
                fee(draft, FeeBandKind.CANCELLATION, 0, 6, "100"),
                fee(draft, FeeBandKind.CANCELLATION, 7, 13, "50"),
                fee(draft, FeeBandKind.CANCELLATION, 14, 29, "25"),
                fee(draft, FeeBandKind.CANCELLATION, 30, null, "10"),
                fee(draft, FeeBandKind.SHORT_NOTICE, 0, 13, "1.25"),
                fee(draft, FeeBandKind.SHORT_NOTICE, 14, 21, "1.10")));
        catalog.publish(lan, new PublishRequest(CHANGE_NOTE));
        log.info("Seeded rate catalog v{}", draft.getVersionNo());
    }

    private static List<RateLine> everyCorridorLines(RateCatalogVersion v) {
        RateLine waiting = line(v, null, "WAITING", "H", "Waiting time", RateBasis.PER_HOUR, "95");
        waiting.setDefaultQuantity(new BigDecimal("2"));
        waiting.setCertainty(RateCertainty.ESTIMATED);
        waiting.setEstimateNote("Billed by the hour if the flight or border queue runs late.");
        return List.of(
                line(v, null, "LOADING", "A", "Loading and handling at origin", RateBasis.PER_HORSE, "120"),
                isolation(v, "ISO_STALLION", HorseSex.STALLION, "140"),
                isolation(v, "ISO_MARE", HorseSex.MARE, "85"),
                isolation(v, "ISO_GELDING", HorseSex.GELDING, "70"),
                line(v, null, "VET_BLOODS", "B", "Veterinary inspection and bloods", RateBasis.PER_HORSE, "310"),
                line(v, null, "GROOM", "D", "Groom, road escort", RateBasis.PER_THREE_HORSES, "480"),
                line(v, null, "HEALTH_CERT", "E", "Export health certificate", RateBasis.PER_HORSE, "180"),
                line(v, null, "POST_ISO", "F", "Post-arrival isolation", RateBasis.PER_DAY, "95"),
                waiting);
    }

    private static List<RateLine> airLines(RateCatalogVersion v, Corridor c) {
        return List.of(
                line(
                        v,
                        c,
                        "TRANSFER_ORIGIN",
                        "A",
                        "Road transfer to the cargo terminal",
                        RateBasis.PER_SHIPMENT,
                        "250"),
                line(v, c, "HANDLING", "C", "Airline handling and stall build-up", RateBasis.PER_SHIPMENT, "950"),
                line(v, c, "GROOM", "D", "Flying groom", RateBasis.PER_THREE_HORSES, "1450"),
                line(v, c, "FLIGHT_VET", "D", "Flight veterinarian", RateBasis.FLIGHT_VET, "2200"),
                line(v, c, "IMPORT_PERMIT", "E", "Import permit handling", RateBasis.PER_SHIPMENT, "380"),
                line(
                        v,
                        c,
                        "TRANSFER_DEST",
                        "G",
                        "Road transfer from the cargo terminal",
                        RateBasis.PER_SHIPMENT,
                        "300"));
    }

    /** HAN → VTE gets the shared road rate only and no crossing fee: the two gaps of the Blocked frame. */
    private static List<RateLine> roadLines(RateCatalogVersion v, Corridor c) {
        boolean hanoiVientiane =
                "Hanoi".equalsIgnoreCase(c.getOriginCity()) && "Vientiane".equalsIgnoreCase(c.getDestinationCity());
        List<RateLine> list = new ArrayList<>();
        list.add(road(v, c, "ROAD_SHARED", "Road freight, shared load", TrailerType.SHARED, "2.40"));
        if (hanoiVientiane) {
            return list;
        }
        list.add(road(v, c, "ROAD_PRIVATE", "Road freight, private trailer", TrailerType.PRIVATE, "3.60"));
        if (!c.getCrossings().isEmpty()) {
            list.add(line(v, c, "CROSSING", "E", "Customs and border documentation", RateBasis.PER_CROSSING, "420"));
        }
        return list;
    }

    private static RateLine line(
            RateCatalogVersion v,
            Corridor c,
            String code,
            String group,
            String description,
            RateBasis basis,
            String rate) {
        RateLine l = new RateLine();
        l.setVersion(v);
        l.setCorridor(c);
        l.setCode(code);
        l.setGroupCode(group);
        l.setDescription(description);
        l.setBasis(basis);
        l.setRate(new BigDecimal(rate));
        l.setCertainty(RateCertainty.FIXED);
        return l;
    }

    private static RateLine isolation(RateCatalogVersion v, String code, HorseSex sex, String rate) {
        RateLine l = line(v, null, code, "B", "Pre-export isolation", RateBasis.PER_DAY, rate);
        l.setAppliesToSex(sex);
        return l;
    }

    private static RateLine road(
            RateCatalogVersion v, Corridor c, String code, String description, TrailerType trailer, String rate) {
        RateLine l = line(v, c, code, "C", description, RateBasis.PER_KM, rate);
        l.setAppliesToTrailer(trailer);
        l.setMinCharge(new BigDecimal("400"));
        return l;
    }

    private static RateServiceClass stall(RateCatalogVersion v, Corridor c, ServiceClass sc) {
        int width = switch (sc) {
            case ECONOMY -> 32;
            case BUSINESS -> 48;
            case FIRST -> 96;
        };
        RateServiceClass s = new RateServiceClass();
        s.setVersion(v);
        s.setCorridor(c);
        s.setServiceClass(sc);
        s.setWidthPerHorseIn((short) width);
        s.setHorsesPerPosition((short) (96 / width));
        s.setPositionRate(new BigDecimal("16800"));
        return s;
    }

    private static RateVolumeBreak band(RateCatalogVersion v, int min, Integer max, String pct) {
        RateVolumeBreak b = new RateVolumeBreak();
        b.setVersion(v);
        b.setMinHorses((short) min);
        b.setMaxHorses(max == null ? null : max.shortValue());
        b.setDiscountPct(new BigDecimal(pct));
        return b;
    }

    private static RateFeeBand fee(RateCatalogVersion v, FeeBandKind kind, int min, Integer max, String value) {
        RateFeeBand f = new RateFeeBand();
        f.setVersion(v);
        f.setKind(kind);
        f.setMinDays((short) min);
        f.setMaxDays(max == null ? null : max.shortValue());
        f.setValue(new BigDecimal(value));
        return f;
    }
}
