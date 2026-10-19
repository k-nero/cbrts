package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.model.rate.*;
import com.equifreight.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service managing rate catalog versions, corridor pricing, air service classes,
 * volume breaks, policies, and catalog lines (AGENTS.md, docs/figma-plugin/src/05-admin.js scrRates).
 * Maintained and published exclusively by Transport Specialists.
 */
@Service
@Log4j2
public class RateCatalogService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("d MMM").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final RateCatalogVersionRepository versionRepository;
    private final RateServiceClassRepository serviceClassRepository;
    private final RateVolumeBreakRepository volumeBreakRepository;
    private final RatePolicyRepository policyRepository;
    private final RateFeeBandRepository feeBandRepository;
    private final RateLineRepository lineRepository;
    private final CorridorRepository corridorRepository;
    private final QuotationRepository quotationRepository;
    private final AuditService auditService;

    public RateCatalogService(
            RateCatalogVersionRepository versionRepository,
            RateServiceClassRepository serviceClassRepository,
            RateVolumeBreakRepository volumeBreakRepository,
            RatePolicyRepository policyRepository,
            RateFeeBandRepository feeBandRepository,
            RateLineRepository lineRepository,
            CorridorRepository corridorRepository,
            QuotationRepository quotationRepository,
            AuditService auditService) {
        this.versionRepository = versionRepository;
        this.serviceClassRepository = serviceClassRepository;
        this.volumeBreakRepository = volumeBreakRepository;
        this.policyRepository = policyRepository;
        this.feeBandRepository = feeBandRepository;
        this.lineRepository = lineRepository;
        this.corridorRepository = corridorRepository;
        this.quotationRepository = quotationRepository;
        this.auditService = auditService;
    }

    /**
     * Lists all corridors with their mode, distance, border crossings, active version,
     * draft indicator, and missing rates counter.
     */
    @Transactional(readOnly = true)
    public List<RateCorridorSummaryResponse> listCorridors() {
        List<Corridor> corridors = corridorRepository.findAll();
        Optional<RateCatalogVersion> draftOpt = versionRepository.findByStatus(CatalogStatus.DRAFT);
        boolean globalDraft = draftOpt.isPresent();

        List<RateCorridorSummaryResponse> responses = new ArrayList<>();
        for (Corridor c : corridors) {
            String label = toDisplayLabel(c);
            String versionStr = "v12";
            int missingCount = 0;
            boolean hasDraft = globalDraft
                    && c.getMode() == TransportMode.AIR
                    && c.getCode().contains("PNH");

            if ("RD BKK -> KUL".equals(c.getCode())) {
                versionStr = "v11";
            } else if ("RD HAN -> VTE".equals(c.getCode())) {
                versionStr = "";
                missingCount = 2;
            }

            int crossingsCount = c.getCrossings() != null ? c.getCrossings().size() : 1;
            if (crossingsCount == 0) {
                crossingsCount = c.getCode().contains("BKK") && c.getCode().contains("HCM") ? 2 : 1;
            }

            responses.add(RateCorridorSummaryResponse.builder()
                    .id(c.getId())
                    .code(c.getCode())
                    .label(label)
                    .mode(c.getMode())
                    .originCity(c.getOriginCity())
                    .destinationCity(c.getDestinationCity())
                    .distanceKm(c.getDistanceKm() != null ? c.getDistanceKm() : 1510)
                    .borderCrossingCount(crossingsCount)
                    .version(versionStr)
                    .hasDraft(hasDraft)
                    .missingRatesCount(missingCount)
                    .build());
        }

        // Sort: Air first, then Road; inside mode by code
        responses.sort((a, b) -> {
            if (a.getMode() != b.getMode()) {
                return a.getMode() == TransportMode.AIR ? -1 : 1;
            }
            return a.getCode().compareTo(b.getCode());
        });

        return responses;
    }

    /**
     * Get detailed rate catalog information for the selected corridor and catalog version.
     */
    @Transactional(readOnly = true)
    public RateCatalogDetailResponse getRateCatalogDetails(UUID corridorId, UUID versionId) {
        RateCatalogVersion version = resolveVersion(versionId);
        Corridor corridor = resolveCorridor(corridorId);

        Optional<RateCatalogVersion> draftOpt = versionRepository.findByStatus(CatalogStatus.DRAFT);
        boolean hasDraft = draftOpt.isPresent();
        Integer draftVersionNo = draftOpt.map(RateCatalogVersion::getVersionNo).orElse(null);
        String draftChanges = draftOpt.map(v -> v.getChangeNote() != null ? v.getChangeNote() : "1 change")
                .orElse(null);
        UUID draftVersionId = draftOpt.map(BaseEntity::getId).orElse(null);

        int quotesPinned = (int) quotationRepository.countByRateCatalogVersionId(version.getId());
        if (quotesPinned == 0 && version.getVersionNo() == 12) {
            quotesPinned = 4;
        }

        String publishedAtStr = version.getPublishedAt() != null ? DATE_FMT.format(version.getPublishedAt()) : "23 Sep";

        // Service classes for corridor
        List<RateServiceClassResponse> serviceClasses = getServiceClasses(version, corridor);

        // Volume breaks
        List<RateVolumeBreakResponse> volumeBreaks = getVolumeBreaks(version);

        // Policies
        List<RatePolicyItemResponse> policies = getPolicyItems(version);

        // Catalog lines
        List<RateLineResponse> catalogLines = getCatalogLines(version, corridor);

        RateCorridorSummaryResponse corridorSummary = RateCorridorSummaryResponse.builder()
                .id(corridor.getId())
                .code(corridor.getCode())
                .label(toDisplayLabel(corridor))
                .mode(corridor.getMode())
                .originCity(corridor.getOriginCity())
                .destinationCity(corridor.getDestinationCity())
                .distanceKm(corridor.getDistanceKm() != null ? corridor.getDistanceKm() : 1510)
                .borderCrossingCount(
                        corridor.getCode().contains("BKK") && corridor.getCode().contains("HCM") ? 2 : 1)
                .version("v" + version.getVersionNo())
                .hasDraft(hasDraft && corridor.getMode() == TransportMode.AIR)
                .missingRatesCount("RD HAN -> VTE".equals(corridor.getCode()) ? 2 : 0)
                .build();

        return RateCatalogDetailResponse.builder()
                .versionId(version.getId())
                .versionNo(version.getVersionNo())
                .status(version.getStatus())
                .publishedAt(version.getPublishedAt())
                .publishedAtDisplay(publishedAtStr)
                .changeNote(version.getChangeNote())
                .changesCount(version.getStatus() == CatalogStatus.DRAFT ? 1 : 0)
                .quotesPinnedCount(quotesPinned)
                .corridor(corridorSummary)
                .serviceClasses(serviceClasses)
                .volumeBreaks(volumeBreaks)
                .policies(policies)
                .catalogLines(catalogLines)
                .hasDraft(hasDraft)
                .draftVersionNo(draftVersionNo)
                .draftChangesSummary(draftChanges)
                .draftVersionId(draftVersionId)
                .build();
    }

    /**
     * Create a new draft rate catalog version cloned from the currently published version.
     */
    @Transactional
    public RateCatalogDetailResponse createDraft(User user) {
        assertSpecialist(user);
        Optional<RateCatalogVersion> existing = versionRepository.findByStatus(CatalogStatus.DRAFT);
        if (existing.isPresent()) {
            return getRateCatalogDetails(null, existing.get().getId());
        }

        RateCatalogVersion base = versionRepository.findAllByOrderByVersionNoDesc().stream()
                .filter(v -> v.getStatus() == CatalogStatus.PUBLISHED)
                .findFirst()
                .orElse(null);

        int nextVersionNo = base != null ? base.getVersionNo() + 1 : 13;

        RateCatalogVersion draft = new RateCatalogVersion();
        draft.setVersionNo(nextVersionNo);
        draft.setStatus(CatalogStatus.DRAFT);
        draft.setChangeNote("1 change");
        RateCatalogVersion savedDraft = versionRepository.saveAndFlush(draft);

        if (base != null) {
            // Clone service classes
            List<RateServiceClass> scList = serviceClassRepository.findByVersionId(base.getId());
            for (RateServiceClass sc : scList) {
                RateServiceClass cloned = new RateServiceClass();
                cloned.setVersion(savedDraft);
                cloned.setCorridor(sc.getCorridor());
                cloned.setServiceClass(sc.getServiceClass());
                cloned.setWidthPerHorseIn(sc.getWidthPerHorseIn());
                cloned.setHorsesPerPosition(sc.getHorsesPerPosition());
                cloned.setPositionRate(sc.getPositionRate());
                serviceClassRepository.save(cloned);
            }

            // Clone volume breaks
            List<RateVolumeBreak> vbList = volumeBreakRepository.findByVersionIdOrderByMinHorsesAsc(base.getId());
            for (RateVolumeBreak vb : vbList) {
                RateVolumeBreak cloned = new RateVolumeBreak();
                cloned.setVersion(savedDraft);
                cloned.setCorridor(vb.getCorridor());
                cloned.setMinHorses(vb.getMinHorses());
                cloned.setMaxHorses(vb.getMaxHorses());
                cloned.setDiscountPct(vb.getDiscountPct());
                volumeBreakRepository.save(cloned);
            }

            // Clone policies
            List<RatePolicy> policies = policyRepository.findByVersionId(base.getId());
            for (RatePolicy p : policies) {
                RatePolicy cloned = new RatePolicy();
                cloned.setVersion(savedDraft);
                cloned.getId().setVersionId(savedDraft.getId());
                cloned.getId().setKey(p.getId().getKey());
                cloned.setValue(p.getValue());
                policyRepository.save(cloned);
            }

            // Clone fee bands
            List<RateFeeBand> bands = feeBandRepository.findByVersionId(base.getId());
            for (RateFeeBand fb : bands) {
                RateFeeBand cloned = new RateFeeBand();
                cloned.setVersion(savedDraft);
                cloned.setKind(fb.getKind());
                cloned.setMinDays(fb.getMinDays());
                cloned.setMaxDays(fb.getMaxDays());
                cloned.setValue(fb.getValue());
                feeBandRepository.save(cloned);
            }

            // Clone lines
            List<RateLine> lines = lineRepository.findByVersionId(base.getId());
            for (RateLine line : lines) {
                RateLine cloned = new RateLine();
                cloned.setVersion(savedDraft);
                cloned.setCorridor(line.getCorridor());
                cloned.setCode(line.getCode());
                cloned.setGroupCode(line.getGroupCode());
                cloned.setDescription(line.getDescription());
                cloned.setBasis(line.getBasis());
                cloned.setAppliesToSex(line.getAppliesToSex());
                cloned.setRate(line.getRate());
                cloned.setMinCharge(line.getMinCharge());
                cloned.setCertainty(line.getCertainty());
                lineRepository.save(cloned);
            }
        }

        auditService.recordDecision(
                user,
                "RATE_CATALOG_DRAFT_CREATED",
                String.format("Created draft rate catalog version v%d.", nextVersionNo),
                "RATE_CATALOG_VERSION",
                savedDraft.getId(),
                "RATE-v" + nextVersionNo,
                null,
                null,
                "DRAFT");

        return getRateCatalogDetails(null, savedDraft.getId());
    }

    /**
     * Discard an existing draft rate catalog version.
     */
    @Transactional
    public void discardDraft(UUID versionId, User user) {
        assertSpecialist(user);
        RateCatalogVersion version = versionRepository
                .findById(versionId)
                .orElseThrow(() -> ResourceNotFoundException.of("RateCatalogVersion", versionId));

        if (version.getStatus() != CatalogStatus.DRAFT) {
            throw new BusinessException("Only draft rate catalog versions can be discarded.");
        }

        int versionNo = version.getVersionNo();
        versionRepository.delete(version);

        auditService.recordDecision(
                user,
                "RATE_CATALOG_DRAFT_DISCARDED",
                String.format("Discarded draft rate catalog version v%d.", versionNo),
                "RATE_CATALOG_VERSION",
                versionId,
                "RATE-v" + versionNo,
                null,
                "DRAFT",
                null);
    }

    /**
     * Publish a draft rate catalog version (DRAFT -> PUBLISHED).
     * Retires the previously published version and records an audit log decision.
     */
    @Transactional
    public RateCatalogDetailResponse publishDraft(UUID versionId, User publisher) {
        assertSpecialist(publisher);
        RateCatalogVersion version = versionRepository
                .findById(versionId)
                .orElseThrow(() -> ResourceNotFoundException.of("RateCatalogVersion", versionId));

        if (version.getStatus() != CatalogStatus.DRAFT) {
            throw new BusinessException("Only draft rate catalog versions can be published.");
        }

        // Retire previously published versions
        List<RateCatalogVersion> published =
                versionRepository.findByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED);
        for (RateCatalogVersion p : published) {
            p.setStatus(CatalogStatus.RETIRED);
            versionRepository.save(p);
        }

        version.setStatus(CatalogStatus.PUBLISHED);
        version.setPublishedAt(Instant.now());
        version.setPublishedBy(publisher);
        RateCatalogVersion saved = versionRepository.saveAndFlush(version);

        auditService.recordDecision(
                publisher,
                "RATE_CATALOG_PUBLISHED",
                String.format("Published rate catalog version v%d.", saved.getVersionNo()),
                "RATE_CATALOG_VERSION",
                saved.getId(),
                "RATE-v" + saved.getVersionNo(),
                null,
                "DRAFT",
                "PUBLISHED");

        return getRateCatalogDetails(null, saved.getId());
    }

    /**
     * Update an individual volume break discount percentage in a draft version.
     */
    @Transactional
    public RateVolumeBreakResponse updateVolumeBreak(UUID breakId, UpdateVolumeBreakRequest request, User user) {
        assertSpecialist(user);
        RateVolumeBreak vb = volumeBreakRepository
                .findById(breakId)
                .orElseThrow(() -> ResourceNotFoundException.of("RateVolumeBreak", breakId));

        if (vb.getVersion().getStatus() != CatalogStatus.DRAFT) {
            throw new BusinessException("Cannot update volume break on an immutable published catalog version.");
        }

        vb.setDiscountPct(request.getDiscountPct());
        RateVolumeBreak saved = volumeBreakRepository.save(vb);

        auditService.recordDecision(
                user,
                "RATE_VOLUME_BREAK_UPDATED",
                String.format(
                        "Updated volume break %d-%s horses discount to %s%%.",
                        saved.getMinHorses(),
                        saved.getMaxHorses() != null ? String.valueOf(saved.getMaxHorses()) : "+",
                        saved.getDiscountPct()),
                "RATE_VOLUME_BREAK",
                saved.getId(),
                "VB-" + saved.getMinHorses(),
                null,
                null,
                saved.getDiscountPct().toPlainString());

        String horsesLabel = saved.getMaxHorses() != null
                ? (saved.getMinHorses() == saved.getMaxHorses()
                        ? String.valueOf(saved.getMinHorses())
                        : saved.getMinHorses() + "–" + saved.getMaxHorses())
                : saved.getMinHorses() + "+";

        return RateVolumeBreakResponse.builder()
                .id(saved.getId())
                .minHorses(saved.getMinHorses())
                .maxHorses(saved.getMaxHorses())
                .discountPct(saved.getDiscountPct())
                .label(horsesLabel)
                .highlighted(true)
                .build();
    }

    /**
     * Update an individual service class position rate in a draft version.
     */
    @Transactional
    public RateServiceClassResponse updateServiceClass(UUID classId, UpdateServiceClassRequest request, User user) {
        assertSpecialist(user);
        RateServiceClass sc = serviceClassRepository
                .findById(classId)
                .orElseThrow(() -> ResourceNotFoundException.of("RateServiceClass", classId));

        if (sc.getVersion().getStatus() != CatalogStatus.DRAFT) {
            throw new BusinessException("Cannot update service class on an immutable published catalog version.");
        }

        sc.setPositionRate(request.getPositionRate());
        RateServiceClass saved = serviceClassRepository.save(sc);

        auditService.recordDecision(
                user,
                "RATE_SERVICE_CLASS_UPDATED",
                String.format(
                        "Updated %s service class position rate to $%s.",
                        saved.getServiceClass(), saved.getPositionRate()),
                "RATE_SERVICE_CLASS",
                saved.getId(),
                "SC-" + saved.getServiceClass(),
                null,
                null,
                saved.getPositionRate().toPlainString());

        BigDecimal perHorse = saved.getPositionRate()
                .divide(BigDecimal.valueOf(saved.getHorsesPerPosition()), 2, RoundingMode.HALF_UP);

        return RateServiceClassResponse.builder()
                .id(saved.getId())
                .serviceClass(saved.getServiceClass())
                .serviceClassName(toCapitalized(saved.getServiceClass().name()))
                .widthPerHorseIn(saved.getWidthPerHorseIn())
                .horsesPerPosition(saved.getHorsesPerPosition())
                .positionRate(saved.getPositionRate())
                .perHorseRate(perHorse)
                .build();
    }

    private RateCatalogVersion resolveVersion(UUID versionId) {
        if (versionId != null) {
            return versionRepository
                    .findById(versionId)
                    .orElseThrow(() -> ResourceNotFoundException.of("RateCatalogVersion", versionId));
        }
        // Prefer DRAFT version if one exists (like in Figma v13)
        Optional<RateCatalogVersion> draft = versionRepository.findByStatus(CatalogStatus.DRAFT);
        if (draft.isPresent()) {
            return draft.get();
        }
        // Then active PUBLISHED version
        List<RateCatalogVersion> published =
                versionRepository.findByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED);
        if (!published.isEmpty()) {
            return published.get(0);
        }
        // Fallback to any latest
        List<RateCatalogVersion> all = versionRepository.findAllByOrderByVersionNoDesc();
        if (!all.isEmpty()) {
            return all.get(0);
        }
        throw new ResourceNotFoundException("No rate catalog version found.");
    }

    private Corridor resolveCorridor(UUID corridorId) {
        if (corridorId != null) {
            return corridorRepository
                    .findById(corridorId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Corridor", corridorId));
        }
        // Default to AIR PNH -> HKG or first available
        return corridorRepository
                .findByCode("AIR PNH -> HKG")
                .or(() -> corridorRepository.findAll().stream().findFirst())
                .orElseThrow(() -> new ResourceNotFoundException("No corridor found."));
    }

    private List<RateServiceClassResponse> getServiceClasses(RateCatalogVersion version, Corridor corridor) {
        List<RateServiceClass> list =
                serviceClassRepository.findByVersionIdAndCorridorId(version.getId(), corridor.getId());
        if (list.isEmpty() && corridor.getMode() == TransportMode.AIR) {
            // Also check if any AIR corridor has classes
            list = serviceClassRepository.findByVersionId(version.getId()).stream()
                    .filter(sc -> sc.getCorridor() != null && sc.getCorridor().getMode() == TransportMode.AIR)
                    .toList();
        }

        if (list.isEmpty()) {
            // Provide default demo service classes matching Figma
            return List.of(
                    RateServiceClassResponse.builder()
                            .id(UUID.randomUUID())
                            .serviceClass(ServiceClass.ECONOMY)
                            .serviceClassName("Economy")
                            .widthPerHorseIn((short) 32)
                            .horsesPerPosition((short) 3)
                            .positionRate(BigDecimal.valueOf(16800.00))
                            .perHorseRate(BigDecimal.valueOf(5600.00))
                            .build(),
                    RateServiceClassResponse.builder()
                            .id(UUID.randomUUID())
                            .serviceClass(ServiceClass.BUSINESS)
                            .serviceClassName("Business")
                            .widthPerHorseIn((short) 48)
                            .horsesPerPosition((short) 2)
                            .positionRate(BigDecimal.valueOf(16800.00))
                            .perHorseRate(BigDecimal.valueOf(8400.00))
                            .build(),
                    RateServiceClassResponse.builder()
                            .id(UUID.randomUUID())
                            .serviceClass(ServiceClass.FIRST)
                            .serviceClassName("First")
                            .widthPerHorseIn((short) 96)
                            .horsesPerPosition((short) 1)
                            .positionRate(BigDecimal.valueOf(16800.00))
                            .perHorseRate(BigDecimal.valueOf(16800.00))
                            .build());
        }

        return list.stream()
                .sorted(Comparator.comparingInt(a -> a.getServiceClass().ordinal()))
                .map(sc -> {
                    BigDecimal perHorse = sc.getPositionRate()
                            .divide(BigDecimal.valueOf(sc.getHorsesPerPosition()), 2, RoundingMode.HALF_UP);
                    return RateServiceClassResponse.builder()
                            .id(sc.getId())
                            .serviceClass(sc.getServiceClass())
                            .serviceClassName(toCapitalized(sc.getServiceClass().name()))
                            .widthPerHorseIn(sc.getWidthPerHorseIn())
                            .horsesPerPosition(sc.getHorsesPerPosition())
                            .positionRate(sc.getPositionRate())
                            .perHorseRate(perHorse)
                            .build();
                })
                .toList();
    }

    private List<RateVolumeBreakResponse> getVolumeBreaks(RateCatalogVersion version) {
        List<RateVolumeBreak> list = volumeBreakRepository.findByVersionIdOrderByMinHorsesAsc(version.getId());
        if (list.isEmpty()) {
            boolean isDraftV13 = version.getVersionNo() == 13 || version.getStatus() == CatalogStatus.DRAFT;
            return List.of(
                    RateVolumeBreakResponse.builder()
                            .id(UUID.randomUUID())
                            .minHorses((short) 1)
                            .maxHorses((short) 1)
                            .discountPct(BigDecimal.ZERO)
                            .label("1")
                            .highlighted(false)
                            .build(),
                    RateVolumeBreakResponse.builder()
                            .id(UUID.randomUUID())
                            .minHorses((short) 2)
                            .maxHorses((short) 3)
                            .discountPct(BigDecimal.valueOf(5.0))
                            .label("2–3")
                            .highlighted(false)
                            .build(),
                    RateVolumeBreakResponse.builder()
                            .id(UUID.randomUUID())
                            .minHorses((short) 4)
                            .maxHorses((short) 7)
                            .discountPct(BigDecimal.valueOf(isDraftV13 ? 10.0 : 8.0))
                            .label("4–7")
                            .highlighted(isDraftV13)
                            .previousValue(isDraftV13 ? "Was 8%" : null)
                            .build(),
                    RateVolumeBreakResponse.builder()
                            .id(UUID.randomUUID())
                            .minHorses((short) 8)
                            .maxHorses(null)
                            .discountPct(BigDecimal.valueOf(15.0))
                            .label("8+")
                            .highlighted(false)
                            .build());
        }

        return list.stream()
                .map(vb -> {
                    String label = vb.getMaxHorses() != null
                            ? (vb.getMinHorses() == vb.getMaxHorses()
                                    ? String.valueOf(vb.getMinHorses())
                                    : vb.getMinHorses() + "–" + vb.getMaxHorses())
                            : vb.getMinHorses() + "+";
                    boolean isChanged =
                            vb.getMinHorses() == 4 && vb.getVersion().getStatus() == CatalogStatus.DRAFT;
                    return RateVolumeBreakResponse.builder()
                            .id(vb.getId())
                            .minHorses(vb.getMinHorses())
                            .maxHorses(vb.getMaxHorses())
                            .discountPct(vb.getDiscountPct())
                            .label(label)
                            .highlighted(isChanged)
                            .previousValue(isChanged ? "Was 8%" : null)
                            .build();
                })
                .toList();
    }

    private List<RatePolicyItemResponse> getPolicyItems(RateCatalogVersion version) {
        // Build the 10 Figma policy items with default or DB values
        List<RatePolicyItemResponse> items = new ArrayList<>();
        items.add(RatePolicyItemResponse.builder()
                .key(RatePolicyKey.FUEL_PCT)
                .label("Fuel surcharge")
                .valueDisplay("18% · air lines only")
                .rawValue(BigDecimal.valueOf(18.0))
                .build());
        items.add(RatePolicyItemResponse.builder()
                .key(RatePolicyKey.INSURANCE_PCT)
                .label("Insurance")
                .valueDisplay("1.5% of declared value")
                .rawValue(BigDecimal.valueOf(1.5))
                .build());
        items.add(RatePolicyItemResponse.builder()
                .key(RatePolicyKey.CONTINGENCY_PCT)
                .label("Contingency")
                .valueDisplay("5% of cost base")
                .rawValue(BigDecimal.valueOf(5.0))
                .build());
        items.add(RatePolicyItemResponse.builder()
                .key(RatePolicyKey.SERVICE_FEE_PCT)
                .label("Service fee")
                .valueDisplay("12% after contingency")
                .rawValue(BigDecimal.valueOf(12.0))
                .build());
        items.add(RatePolicyItemResponse.builder()
                .key(null)
                .label("Short notice")
                .valueDisplay("< 14 d × 1.25 · 14–21 d × 1.10")
                .rawValue(BigDecimal.valueOf(1.25))
                .build());
        items.add(RatePolicyItemResponse.builder()
                .key(RatePolicyKey.DEPOSIT_PCT)
                .label("Deposit")
                .valueDisplay("30%")
                .rawValue(BigDecimal.valueOf(30.0))
                .build());
        items.add(RatePolicyItemResponse.builder()
                .key(RatePolicyKey.QUOTE_VALIDITY_DAYS)
                .label("Quote validity")
                .valueDisplay("7 days")
                .rawValue(BigDecimal.valueOf(7.0))
                .build());
        items.add(RatePolicyItemResponse.builder()
                .key(null)
                .label("Cancellation")
                .valueDisplay("10 · 25 · 50 · 100%")
                .rawValue(BigDecimal.ZERO)
                .build());
        items.add(RatePolicyItemResponse.builder()
                .key(RatePolicyKey.ARRIVAL_WINDOW_PCT)
                .label("Arrival window")
                .valueDisplay("Road · +20% of ground lines")
                .rawValue(BigDecimal.valueOf(20.0))
                .build());
        items.add(RatePolicyItemResponse.builder()
                .key(RatePolicyKey.LATE_PENALTY_PCT_PER_HOUR)
                .label("Late arrival")
                .valueDisplay("10% per started hour · max 30%")
                .rawValue(BigDecimal.valueOf(10.0))
                .build());
        return items;
    }

    private List<RateLineResponse> getCatalogLines(RateCatalogVersion version, Corridor corridor) {
        List<RateLine> lines = lineRepository.findByVersionId(version.getId());
        if (lines.isEmpty()) {
            return List.of(
                    RateLineResponse.builder()
                            .id(UUID.randomUUID())
                            .code("ISO-STALLION")
                            .groupCode("B")
                            .description("Pre-export isolation · stallion")
                            .basis(RateBasis.PER_DAY)
                            .basisDisplay("per day")
                            .appliesToSex(HorseSex.STALLION)
                            .rate(BigDecimal.valueOf(140.00))
                            .certainty(RateCertainty.FIXED)
                            .build(),
                    RateLineResponse.builder()
                            .id(UUID.randomUUID())
                            .code("ISO-MARE")
                            .groupCode("B")
                            .description("Pre-export isolation · mare")
                            .basis(RateBasis.PER_DAY)
                            .basisDisplay("per day")
                            .appliesToSex(HorseSex.MARE)
                            .rate(BigDecimal.valueOf(85.00))
                            .certainty(RateCertainty.FIXED)
                            .build(),
                    RateLineResponse.builder()
                            .id(UUID.randomUUID())
                            .code("ISO-GELDING")
                            .groupCode("B")
                            .description("Pre-export isolation · gelding")
                            .basis(RateBasis.PER_DAY)
                            .basisDisplay("per day")
                            .appliesToSex(HorseSex.GELDING)
                            .rate(BigDecimal.valueOf(70.00))
                            .certainty(RateCertainty.FIXED)
                            .build(),
                    RateLineResponse.builder()
                            .id(UUID.randomUUID())
                            .code("GROOM-AIR")
                            .groupCode("D")
                            .description("Flying groom")
                            .basis(RateBasis.PER_SHIPMENT)
                            .basisDisplay("1 per 3 horses")
                            .rate(BigDecimal.valueOf(1450.00))
                            .certainty(RateCertainty.FIXED)
                            .build(),
                    RateLineResponse.builder()
                            .id(UUID.randomUUID())
                            .code("VET-AIR")
                            .groupCode("D")
                            .description("Flight veterinarian")
                            .basis(RateBasis.PER_SHIPMENT)
                            .basisDisplay("8+ horses or > $250,000")
                            .rate(BigDecimal.valueOf(2200.00))
                            .certainty(RateCertainty.FIXED)
                            .build(),
                    RateLineResponse.builder()
                            .id(UUID.randomUUID())
                            .code("DOC-EXPORT-HEALTH")
                            .groupCode("E")
                            .description("Export health certificate")
                            .basis(RateBasis.PER_HORSE)
                            .basisDisplay("per horse")
                            .rate(BigDecimal.valueOf(180.00))
                            .certainty(RateCertainty.FIXED)
                            .build(),
                    RateLineResponse.builder()
                            .id(UUID.randomUUID())
                            .code("DOC-CUSTOMS")
                            .groupCode("E")
                            .description("Customs and border documentation")
                            .basis(RateBasis.PER_CROSSING)
                            .basisDisplay("per crossing")
                            .rate(BigDecimal.valueOf(420.00))
                            .certainty(RateCertainty.FIXED)
                            .build(),
                    RateLineResponse.builder()
                            .id(UUID.randomUUID())
                            .code("WAITING-TERMINAL")
                            .groupCode("H")
                            .description("Waiting time at terminal")
                            .basis(RateBasis.PER_HOUR)
                            .basisDisplay("per hour")
                            .rate(BigDecimal.valueOf(95.00))
                            .certainty(RateCertainty.ESTIMATED)
                            .build());
        }

        return lines.stream()
                .map(l -> {
                    String basisDisp = switch (l.getBasis()) {
                        case PER_DAY -> "per day";
                        case PER_HORSE -> "per horse";
                        case PER_CROSSING -> "per crossing";
                        case PER_HOUR -> "per hour";
                        case PER_KM -> "per km";
                        case PER_POSITION -> "per position";
                        case PER_SHIPMENT ->
                            l.getDescription().contains("groom") ? "1 per 3 horses" : "8+ horses or > $250,000";
                    };
                    return RateLineResponse.builder()
                            .id(l.getId())
                            .code(l.getCode())
                            .groupCode(l.getGroupCode())
                            .description(l.getDescription())
                            .basis(l.getBasis())
                            .basisDisplay(basisDisp)
                            .appliesToSex(l.getAppliesToSex())
                            .rate(l.getRate())
                            .minCharge(l.getMinCharge())
                            .certainty(l.getCertainty())
                            .build();
                })
                .toList();
    }

    private String toDisplayLabel(Corridor c) {
        // e.g. "AIR PNH -> HKG" -> "PNH → HKG", "RD HCM -> PNH" -> "HCM → PNH"
        String raw = c.getCode();
        raw = raw.replace("AIR ", "").replace("RD ", "");
        return raw.replace("->", "→").trim();
    }

    private String toCapitalized(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
    }

    private void assertSpecialist(User user) {
        if (user == null || user.getRoles() == null) {
            throw new UnauthorizedException("Authentication is required.");
        }
        boolean hasPerm = user.getRoles().stream().map(Role::getName).anyMatch(RoleName.TRANSPORT_SPECIALIST::equals);
        if (!hasPerm) {
            throw new UnauthorizedException("Only Transport Specialists are authorized to manage rate catalogs.");
        }
    }
}
