package com.equifreight.service;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateFeeBand;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.RateVolumeBreak;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.rate.DraftResult;
import com.equifreight.model.rate.PublishRequest;
import com.equifreight.model.rate.RateCatalogResponse;
import com.equifreight.model.rate.RateCorridorView;
import com.equifreight.model.rate.RateLineRequest;
import com.equifreight.model.rate.RateMapper;
import com.equifreight.model.rate.RateVersionResponse;
import com.equifreight.model.rate.ServiceClassRequest;
import com.equifreight.model.rate.VolumeBreakRequest;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.RateLineRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RateServiceClassRepository;
import com.equifreight.repository.RateVolumeBreakRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.MissingRate;
import com.equifreight.service.pricing.PricingText;
import com.equifreight.service.pricing.QuotePricer;
import com.equifreight.service.pricing.RateSetLoader;
import com.equifreight.service.pricing.RequiredRates;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The transport specialist's rate catalog (US-Q-10, #31): one version for every corridor, edited as a draft and
 * published as the next version. A quotation pins the version it was priced from, so publishing never changes one.
 */
@Service
public class RateCatalogService {

    static final String ENTITY_TYPE = "RATE_CATALOG_VERSION";

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    /** " · stallion", the longest sex the quotation appends to a sex line's description. */
    private static final int SEX_SUFFIX_MAX = " · stallion".length();

    private static final Map<RatePolicyKey, String> POLICY_LABELS = Map.ofEntries(
            Map.entry(RatePolicyKey.FUEL_PCT, "Fuel surcharge"),
            Map.entry(RatePolicyKey.INSURANCE_PCT, "Transit insurance"),
            Map.entry(RatePolicyKey.CONTINGENCY_PCT, "Contingency"),
            Map.entry(RatePolicyKey.SERVICE_FEE_PCT, "Service fee"),
            Map.entry(RatePolicyKey.DEPOSIT_PCT, "Deposit"),
            Map.entry(RatePolicyKey.QUOTE_VALIDITY_DAYS, "Quote validity"),
            Map.entry(RatePolicyKey.ESTIMATE_BAND_PCT, "Estimate band"),
            Map.entry(RatePolicyKey.FLIGHT_VET_MIN_HORSES, "The flight vet threshold"),
            Map.entry(RatePolicyKey.HIGH_VALUE_THRESHOLD, "The high value threshold"),
            Map.entry(RatePolicyKey.ARRIVAL_WINDOW_PCT, "Arrival window surcharge"),
            Map.entry(RatePolicyKey.ARRIVAL_WINDOW_MIN_HOURS, "The arrival window minimum"),
            Map.entry(RatePolicyKey.LATE_PENALTY_PCT_PER_HOUR, "Late penalty per hour"),
            Map.entry(RatePolicyKey.LATE_PENALTY_CAP_PCT, "Late penalty cap"),
            Map.entry(RatePolicyKey.STALL_PAYLOAD_KG, "The stall payload"),
            Map.entry(RatePolicyKey.AIR_SHIPMENT_MAX_KG, "The air shipment limit"),
            Map.entry(RatePolicyKey.TURNAROUND_HOURS, "The turnaround"));

    private final RateCatalogVersionRepository versions;
    private final RateSetLoader loader;
    private final CorridorRepository corridors;
    private final QuotationRepository quotations;
    private final RateLineRepository lines;
    private final RateServiceClassRepository classes;
    private final RateVolumeBreakRepository breaks;
    private final RatePolicyRepository policies;
    private final RateFeeBandRepository feeBands;
    private final AuditService audit;
    private final Clock clock;

    public RateCatalogService(
            RateCatalogVersionRepository versions,
            RateSetLoader loader,
            CorridorRepository corridors,
            QuotationRepository quotations,
            RateLineRepository lines,
            RateServiceClassRepository classes,
            RateVolumeBreakRepository breaks,
            RatePolicyRepository policies,
            RateFeeBandRepository feeBands,
            AuditService audit,
            Clock clock) {
        this.versions = versions;
        this.loader = loader;
        this.corridors = corridors;
        this.quotations = quotations;
        this.lines = lines;
        this.classes = classes;
        this.breaks = breaks;
        this.policies = policies;
        this.feeBands = feeBands;
        this.audit = audit;
        this.clock = clock;
    }

    /** The versions, newest first, and every corridor with its missing-rate count (against the draft if any). */
    @Transactional(readOnly = true)
    public RateCatalogResponse catalog() {
        List<RateCatalogVersion> all = versions.findAllByOrderByVersionNoDesc();
        RateCatalogVersion current = first(all, CatalogStatus.PUBLISHED);
        RateCatalogVersion draft = first(all, CatalogStatus.DRAFT);
        RateCatalogVersion counted = draft != null ? draft : current;
        CatalogRows rows = counted == null ? null : loader.load(counted.getId());
        List<Corridor> sorted = corridors.findAll(Sort.by("code"));
        Map<UUID, Long> pinned = new HashMap<>();
        all.forEach(v -> pinned.put(v.getId(), quotations.countByRateCatalogVersionId(v.getId())));
        Map<UUID, Integer> missingCounts = new HashMap<>();
        if (rows != null) {
            sorted.forEach(c -> missingCounts.put(c.getId(), missing(rows, c).size()));
        }
        return RateMapper.toCatalogResponse(all, pinned, sorted, missingCounts);
    }

    /** One corridor's rates in one version, with the rates it lacks. */
    @Transactional(readOnly = true)
    public RateCorridorView corridorView(UUID versionId, UUID corridorId) {
        CatalogRows rows = loader.load(versionId);
        Corridor corridor =
                corridors.findById(corridorId).orElseThrow(() -> ResourceNotFoundException.of("Corridor", corridorId));
        return RateMapper.toCorridorView(rows, corridor, missing(rows, corridor));
    }

    // --- the draft ----------------------------------------------------------------------------------------

    /**
     * Copies the published version into a new draft numbered next; returns the draft if one already exists. The
     * published row is locked first, so two calls at once are served one after the other and the second finds the
     * first's draft instead of colliding on the one-draft index.
     */
    @Transactional
    public DraftResult createDraft(User user) {
        RateCatalogVersion current = versions.lockByStatus(CatalogStatus.PUBLISHED)
                .orElseThrow(() -> new ConflictException("NO_PUBLISHED_CATALOG", "No rate catalog is published yet."));
        Optional<RateCatalogVersion> existing = versions.findByStatus(CatalogStatus.DRAFT);
        if (existing.isPresent()) {
            return new DraftResult(RateMapper.toVersionResponse(existing.get(), 0), false);
        }
        CatalogRows rows = loader.load(current.getId());
        RateCatalogVersion draft = new RateCatalogVersion();
        Integer max = versions.maxVersionNo();
        draft.setVersionNo((max == null ? 0 : max) + 1);
        draft.setStatus(CatalogStatus.DRAFT);
        touch(draft, user);
        draft = versions.saveAndFlush(draft);
        copyRows(rows, draft);
        return new DraftResult(RateMapper.toVersionResponse(draft, 0), true);
    }

    @Transactional
    public void discardDraft(User user) {
        RateCatalogVersion draft = requireDraft();
        versions.delete(draft);
        audit.recordDecision(
                user,
                "RATE_CATALOG_DRAFT_DISCARDED",
                "Rate catalog draft v" + draft.getVersionNo() + " discarded",
                ENTITY_TYPE,
                draft.getId(),
                entityCode(draft),
                null,
                null,
                null);
    }

    /** The draft becomes the current version; the version it replaces is retired, and quotations keep their pin. */
    @Transactional
    public RateVersionResponse publish(User user, PublishRequest request) {
        String note = request.changeNote() == null ? "" : request.changeNote().strip();
        if (note.isEmpty()) {
            throw new BusinessException("CHANGE_NOTE", "Say what changed in this version.");
        }
        if (note.length() > AuditText.MAX) {
            throw new BusinessException("CHANGE_NOTE", "The change note must be 500 characters or fewer.");
        }
        RateCatalogVersion draft = requireDraft();
        versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED).ifPresent(previous -> {
            previous.setStatus(CatalogStatus.RETIRED);
            versions.save(previous);
        });
        draft.setStatus(CatalogStatus.PUBLISHED);
        draft.setPublishedAt(Instant.now(clock));
        draft.setPublishedBy(user);
        draft.setChangeNote(note);
        versions.save(draft);
        audit.recordDecision(
                user,
                "RATE_CATALOG_PUBLISHED",
                AuditText.fit("Rate catalog v" + draft.getVersionNo() + " published: " + note),
                ENTITY_TYPE,
                draft.getId(),
                entityCode(draft),
                null,
                "{\"status\":\"DRAFT\"}",
                "{\"status\":\"PUBLISHED\"}");
        return RateMapper.toVersionResponse(draft, 0);
    }

    // --- service classes -----------------------------------------------------------------------------------

    @Transactional
    public RateCorridorView putServiceClass(
            User user, UUID corridorId, ServiceClass serviceClass, ServiceClassRequest request) {
        RateCatalogVersion draft = requireDraft();
        Corridor corridor = corridor(corridorId);
        if (corridor.getMode() != TransportMode.AIR) {
            throw new BusinessException("SERVICE_CLASS", "Only an air corridor has stall classes.");
        }
        int width = request.widthPerHorseIn();
        if (width < 1 || width > QuotePricer.POSITION_WIDTH_IN) {
            throw new BusinessException("WIDTH_PER_HORSE_IN", "The width per horse must be 1 to 96 in.");
        }
        RateServiceClass row = classes.findByVersionIdAndCorridorIdAndServiceClass(
                        draft.getId(), corridorId, serviceClass)
                .orElseGet(RateServiceClass::new);
        row.setVersion(draft);
        row.setCorridor(corridor);
        row.setServiceClass(serviceClass);
        row.setWidthPerHorseIn((short) width);
        row.setHorsesPerPosition((short) (QuotePricer.POSITION_WIDTH_IN / width));
        row.setPositionRate(request.positionRate());
        classes.save(row);
        return edited(draft, user, corridorId);
    }

    @Transactional
    public RateCorridorView deleteServiceClass(User user, UUID corridorId, ServiceClass serviceClass) {
        RateCatalogVersion draft = requireDraft();
        RateServiceClass row = classes.findByVersionIdAndCorridorIdAndServiceClass(
                        draft.getId(), corridorId, serviceClass)
                .orElseThrow(() -> ResourceNotFoundException.of("Service class", serviceClass));
        classes.delete(row);
        return edited(draft, user, corridorId);
    }

    // --- lines -----------------------------------------------------------------------------------------------

    @Transactional
    public RateCorridorView addLine(User user, RateLineRequest request, UUID viewCorridorId) {
        RateCatalogVersion draft = requireDraft();
        Corridor corridor = request.corridorId() == null ? null : corridor(request.corridorId());
        UUID view = viewOf(request, viewCorridorId);
        checkLine(request, corridor);
        refuseDuplicate(draft, request, null);
        RateLine line = new RateLine();
        line.setVersion(draft);
        apply(line, request, corridor);
        lines.save(line);
        return edited(draft, user, view);
    }

    @Transactional
    public RateCorridorView updateLine(User user, UUID lineId, RateLineRequest request, UUID viewCorridorId) {
        RateCatalogVersion draft = requireDraft();
        RateLine line = draftLine(draft, lineId);
        Corridor corridor = request.corridorId() == null ? null : corridor(request.corridorId());
        UUID view = viewOf(request, viewCorridorId);
        checkLine(request, corridor);
        refuseDuplicate(draft, request, lineId);
        apply(line, request, corridor);
        lines.save(line);
        return edited(draft, user, view);
    }

    @Transactional
    public RateCorridorView deleteLine(User user, UUID lineId, UUID viewCorridorId) {
        RateCatalogVersion draft = requireDraft();
        RateLine line = draftLine(draft, lineId);
        lines.delete(line);
        return edited(draft, user, viewCorridorId);
    }

    // --- volume breaks and policies --------------------------------------------------------------------------

    /** Replaces a corridor's own bands (an empty list removes them) or, with no corridor, the global bands. */
    @Transactional
    public RateCorridorView putVolumeBreaks(
            User user, UUID corridorId, List<VolumeBreakRequest> bands, UUID viewCorridorId) {
        RateCatalogVersion draft = requireDraft();
        Corridor corridor = corridorId == null ? null : corridor(corridorId);
        if (corridor == null || !bands.isEmpty()) {
            checkBands(bands);
        }
        if (corridor == null) {
            breaks.deleteGlobalBands(draft.getId());
        } else {
            breaks.deleteCorridorBands(draft.getId(), corridorId);
        }
        List<RateVolumeBreak> rows = new ArrayList<>();
        for (VolumeBreakRequest band : bands) {
            RateVolumeBreak row = new RateVolumeBreak();
            row.setVersion(draft);
            row.setCorridor(corridor);
            row.setMinHorses(band.minHorses());
            row.setMaxHorses(band.maxHorses());
            row.setDiscountPct(band.discountPct());
            rows.add(row);
        }
        breaks.saveAll(rows);
        return edited(draft, user, viewCorridorId);
    }

    @Transactional
    public RateCorridorView putPolicies(User user, Map<RatePolicyKey, BigDecimal> values, UUID viewCorridorId) {
        RateCatalogVersion draft = requireDraft();
        values.forEach(RateCatalogService::checkPolicy);
        for (Map.Entry<RatePolicyKey, BigDecimal> entry : new TreeMap<>(values).entrySet()) {
            RatePolicy policy = policies.findByVersionIdAndKey(draft.getId(), entry.getKey())
                    .orElseGet(() -> {
                        RatePolicy created = new RatePolicy();
                        created.setVersion(draft);
                        created.setKey(entry.getKey());
                        return created;
                    });
            policy.setValue(entry.getValue());
            policies.save(policy);
        }
        return edited(draft, user, viewCorridorId);
    }

    // --- helpers ----------------------------------------------------------------------------------------------

    private RateCatalogVersion requireDraft() {
        return versions.lockByStatus(CatalogStatus.DRAFT)
                .orElseThrow(
                        () -> new ConflictException("NO_DRAFT", "There is no draft to change. Create a draft first."));
    }

    private Corridor corridor(UUID corridorId) {
        return corridors.findById(corridorId).orElseThrow(() -> ResourceNotFoundException.of("Corridor", corridorId));
    }

    private RateLine draftLine(RateCatalogVersion draft, UUID lineId) {
        return lines.findById(lineId)
                .filter(l -> l.getVersion() != null
                        && draft.getId().equals(l.getVersion().getId()))
                .orElseThrow(() -> ResourceNotFoundException.of("Rate line", lineId));
    }

    /** Records the edit on the draft and answers the corridor the page shows. */
    private RateCorridorView edited(RateCatalogVersion draft, User user, UUID viewCorridorId) {
        touch(draft, user);
        versions.save(draft);
        return corridorView(draft.getId(), viewCorridorId);
    }

    private void touch(RateCatalogVersion draft, User user) {
        draft.setLastEditedBy(user);
        draft.setUpdatedAt(Instant.now(clock));
    }

    private static UUID viewOf(RateLineRequest request, UUID viewCorridorId) {
        UUID view = viewCorridorId != null ? viewCorridorId : request.corridorId();
        if (view == null) {
            throw new BusinessException("CORRIDOR", "Choose the corridor to show after the change.");
        }
        return view;
    }

    private static void checkLine(RateLineRequest r, Corridor corridor) {
        if (r.basis() == RateBasis.PER_POSITION) {
            throw new BusinessException(
                    "BASIS", "Stall positions are priced in the service class table, not as a line.");
        }
        if (r.basis() == RateBasis.PER_KM && corridor != null && corridor.getMode() == TransportMode.AIR) {
            throw new BusinessException(
                    "BASIS",
                    "Air corridors price the flight by stall position; a road transfer to the terminal is per shipment.");
        }
        if (r.basis() == RateBasis.FLIGHT_VET && corridor != null && corridor.getMode() == TransportMode.ROAD) {
            throw new BusinessException(
                    "BASIS", "A road move's vet is the vet escort line; the flight vet rule is for air corridors.");
        }
        if (r.basis() == RateBasis.VET_ESCORT && corridor != null && corridor.getMode() == TransportMode.AIR) {
            throw new BusinessException(
                    "BASIS",
                    "An air move's vet is the flight vet line; a vet escort on request is for road corridors.");
        }
        if (r.appliesToSex() != null && r.basis() != RateBasis.PER_HORSE && r.basis() != RateBasis.PER_DAY) {
            throw new BusinessException("APPLIES_TO_SEX", "Only a per-horse or per-day line can be for one sex.");
        }
        if (r.appliesToSex() != null
                && r.description().strip().length() > PricingText.DESCRIPTION_MAX - SEX_SUFFIX_MAX) {
            throw new BusinessException(
                    "DESCRIPTION",
                    "A line for one sex can have at most " + (PricingText.DESCRIPTION_MAX - SEX_SUFFIX_MAX)
                            + " characters: the quotation adds the sex to it.");
        }
        if (r.appliesToTrailer() != null && r.basis() != RateBasis.PER_KM) {
            throw new BusinessException("APPLIES_TO_TRAILER", "Only a per-km line can be for one trailer kind.");
        }
        if (r.minCharge() != null && r.basis() != RateBasis.PER_KM) {
            throw new BusinessException("MIN_CHARGE", "Only a per-km line has a minimum charge.");
        }
        if (r.basis() == RateBasis.PER_HOUR && r.defaultQuantity() == null) {
            throw new BusinessException("DEFAULT_QUANTITY", "A per-hour line needs the hours it assumes.");
        }
        if (r.certainty() == RateCertainty.ESTIMATED
                && (r.estimateNote() == null || r.estimateNote().isBlank())) {
            throw new BusinessException("ESTIMATE_NOTE", "Say why an estimated line may vary.");
        }
        if (r.coveredByRoadLeg() && !"A".equals(r.group()) && !"G".equals(r.group())) {
            throw new BusinessException(
                    "COVERED_BY_ROAD_LEG", "Only a group A or G line is at an end of the move a road leg can cover.");
        }
    }

    private void refuseDuplicate(RateCatalogVersion draft, RateLineRequest r, UUID exceptLineId) {
        boolean taken = lines.findByVersionId(draft.getId()).stream()
                .filter(l -> !l.getId().equals(exceptLineId))
                .anyMatch(l -> l.getCode().equals(r.code())
                        && Objects.equals(
                                l.getCorridor() == null ? null : l.getCorridor().getId(), r.corridorId()));
        if (taken) {
            throw new ConflictException(
                    "DUPLICATE_RATE_CODE",
                    r.code() + " is already a line "
                            + (r.corridorId() == null ? "for every corridor." : "on this corridor."));
        }
    }

    private static void apply(RateLine line, RateLineRequest r, Corridor corridor) {
        line.setCorridor(corridor);
        line.setCode(r.code());
        line.setGroupCode(r.group());
        line.setDescription(r.description().strip());
        line.setBasis(r.basis());
        line.setAppliesToSex(r.appliesToSex());
        line.setAppliesToTrailer(r.appliesToTrailer());
        line.setRate(r.rate());
        line.setMinCharge(r.minCharge());
        line.setDefaultQuantity(r.defaultQuantity());
        line.setCertainty(r.certainty());
        line.setEstimateNote(
                r.estimateNote() == null || r.estimateNote().isBlank()
                        ? null
                        : r.estimateNote().strip());
        line.setCoveredByRoadLeg(r.coveredByRoadLeg());
    }

    private static void checkBands(List<VolumeBreakRequest> bands) {
        if (bands.isEmpty()) {
            throw bandRefusal("The first band must start at 1 horse.");
        }
        for (VolumeBreakRequest band : bands) {
            if (band == null || band.minHorses() == null) {
                throw bandRefusal("Each band needs the horse count it starts at.");
            }
            BigDecimal pct = band.discountPct();
            if (pct == null || pct.signum() < 0 || pct.compareTo(HUNDRED) > 0) {
                throw bandRefusal("A discount must be between 0 and 100%.");
            }
            if (pct.stripTrailingZeros().scale() > 2) {
                throw bandRefusal("A discount has at most 2 decimals.");
            }
            if (band.maxHorses() != null && band.maxHorses() < band.minHorses()) {
                throw bandRefusal(
                        "A band can't end before it starts: " + band.minHorses() + "–" + band.maxHorses() + ".");
            }
        }
        List<VolumeBreakRequest> sorted = bands.stream()
                .sorted(Comparator.comparing(VolumeBreakRequest::minHorses))
                .toList();
        if (sorted.getFirst().minHorses() != 1) {
            throw bandRefusal("The first band must start at 1 horse.");
        }
        for (int i = 1; i < sorted.size(); i++) {
            VolumeBreakRequest a = sorted.get(i - 1);
            VolumeBreakRequest b = sorted.get(i);
            if (a.maxHorses() == null || b.minHorses() <= a.maxHorses()) {
                throw bandRefusal("The bands overlap at " + b.minHorses() + " horses.");
            }
            if (b.minHorses() > a.maxHorses() + 1) {
                throw bandRefusal("The bands must follow on without gaps: " + bandLabel(a) + " is followed by "
                        + bandLabel(b) + ".");
            }
        }
        VolumeBreakRequest last = sorted.getLast();
        if (last.maxHorses() != null) {
            throw bandRefusal("The last band must be open-ended (" + last.minHorses() + "+).");
        }
    }

    private static String bandLabel(VolumeBreakRequest band) {
        if (band.maxHorses() == null) {
            return band.minHorses() + "+";
        }
        return band.maxHorses().equals(band.minHorses())
                ? String.valueOf(band.minHorses())
                : band.minHorses() + "–" + band.maxHorses();
    }

    private static BusinessException bandRefusal(String message) {
        return new BusinessException("INVALID_VOLUME_BREAKS", message);
    }

    private static void checkPolicy(RatePolicyKey key, BigDecimal value) {
        String label = POLICY_LABELS.get(key);
        if (value == null) {
            throw new BusinessException(key.name(), label + " needs a value.");
        }
        switch (key) {
            case QUOTE_VALIDITY_DAYS -> {
                if (value.compareTo(BigDecimal.ONE) < 0
                        || value.compareTo(BigDecimal.valueOf(30)) > 0
                        || value.stripTrailingZeros().scale() > 0) {
                    throw new BusinessException(key.name(), "Quote validity must be 1 to 30 days.");
                }
            }
            case FLIGHT_VET_MIN_HORSES -> {
                if (value.compareTo(BigDecimal.ONE) < 0
                        || value.stripTrailingZeros().scale() > 0) {
                    throw new BusinessException(key.name(), "The flight vet threshold must be at least 1 horse.");
                }
            }
            case HIGH_VALUE_THRESHOLD -> {
                if (value.signum() < 0) {
                    throw new BusinessException(key.name(), "The high value threshold can't be negative.");
                }
            }
            case STALL_PAYLOAD_KG, AIR_SHIPMENT_MAX_KG -> {
                if (value.compareTo(BigDecimal.ONE) < 0
                        || value.compareTo(BigDecimal.valueOf(99_999)) > 0
                        || value.stripTrailingZeros().scale() > 0) {
                    throw new BusinessException(
                            key.name(), label + " must be a whole number of kilograms from 1 to 99,999.");
                }
            }
            case TURNAROUND_HOURS -> {
                if (value.signum() < 0
                        || value.compareTo(BigDecimal.valueOf(240)) > 0
                        || value.stripTrailingZeros().scale() > 0) {
                    throw new BusinessException(
                            key.name(), "The turnaround must be a whole number of hours from 0 to 240.");
                }
            }
            case ARRIVAL_WINDOW_MIN_HOURS -> {
                if (value.signum() < 0) {
                    throw new BusinessException(key.name(), "The arrival window minimum can't be negative.");
                }
            }
            default -> {
                if (value.signum() < 0 || value.compareTo(HUNDRED) > 0) {
                    throw new BusinessException(key.name(), label + " must be between 0 and 100%.");
                }
            }
        }
    }

    private void copyRows(CatalogRows rows, RateCatalogVersion draft) {
        classes.saveAll(rows.classes().stream()
                .map(c -> {
                    RateServiceClass copy = new RateServiceClass();
                    copy.setVersion(draft);
                    copy.setCorridor(c.getCorridor());
                    copy.setServiceClass(c.getServiceClass());
                    copy.setWidthPerHorseIn(c.getWidthPerHorseIn());
                    copy.setHorsesPerPosition(c.getHorsesPerPosition());
                    copy.setPositionRate(c.getPositionRate());
                    return copy;
                })
                .toList());
        lines.saveAll(rows.lines().stream()
                .map(l -> {
                    RateLine copy = new RateLine();
                    copy.setVersion(draft);
                    copy.setCorridor(l.getCorridor());
                    copy.setCode(l.getCode());
                    copy.setGroupCode(l.getGroupCode());
                    copy.setDescription(l.getDescription());
                    copy.setBasis(l.getBasis());
                    copy.setAppliesToSex(l.getAppliesToSex());
                    copy.setAppliesToTrailer(l.getAppliesToTrailer());
                    copy.setRate(l.getRate());
                    copy.setMinCharge(l.getMinCharge());
                    copy.setDefaultQuantity(l.getDefaultQuantity());
                    copy.setCertainty(l.getCertainty());
                    copy.setEstimateNote(l.getEstimateNote());
                    copy.setCoveredByRoadLeg(l.isCoveredByRoadLeg());
                    return copy;
                })
                .toList());
        breaks.saveAll(rows.breaks().stream()
                .map(b -> {
                    RateVolumeBreak copy = new RateVolumeBreak();
                    copy.setVersion(draft);
                    copy.setCorridor(b.getCorridor());
                    copy.setMinHorses(b.getMinHorses());
                    copy.setMaxHorses(b.getMaxHorses());
                    copy.setDiscountPct(b.getDiscountPct());
                    return copy;
                })
                .toList());
        policies.saveAll(rows.policies().stream()
                .map(p -> {
                    RatePolicy copy = new RatePolicy();
                    copy.setKey(p.getKey());
                    copy.setVersion(draft);
                    copy.setValue(p.getValue());
                    return copy;
                })
                .toList());
        feeBands.saveAll(rows.feeBands().stream()
                .map(f -> {
                    RateFeeBand copy = new RateFeeBand();
                    copy.setVersion(draft);
                    copy.setKind(f.getKind());
                    copy.setMinDays(f.getMinDays());
                    copy.setMaxDays(f.getMaxDays());
                    copy.setValue(f.getValue());
                    return copy;
                })
                .toList());
    }

    private static String entityCode(RateCatalogVersion version) {
        return "Rates v" + version.getVersionNo();
    }

    static List<MissingRate> missing(CatalogRows rows, Corridor corridor) {
        return RequiredRates.forCorridor(
                corridor.getMode(),
                corridor.getCode(),
                corridor.getOriginCity(),
                corridor.getDestinationCity(),
                corridor.getCrossings().size(),
                rows.forCorridor(corridor.getId()));
    }

    private static RateCatalogVersion first(List<RateCatalogVersion> all, CatalogStatus status) {
        return all.stream().filter(v -> v.getStatus() == status).findFirst().orElse(null);
    }
}
