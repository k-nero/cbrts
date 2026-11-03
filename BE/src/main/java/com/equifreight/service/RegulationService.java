package com.equifreight.service;

import com.equifreight.entity.Country;
import com.equifreight.entity.DocumentType;
import com.equifreight.entity.RegulationCatalog;
import com.equifreight.entity.RegulationRule;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.RegulationRuleKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.*;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.DocumentTypeRepository;
import com.equifreight.repository.JobRegulationPinRepository;
import com.equifreight.repository.RegulationCatalogRepository;
import com.equifreight.repository.RegulationRuleRepository;
import com.equifreight.repository.RegulationVersionRepository;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service managing the countries we serve and their health, quarantine, and customs regulation catalogs (AGENTS.md).
 * Catalogs are maintained and published exclusively by Transport Specialists; the controller enforces the role.
 */
@Service
public class RegulationService {

    /** ISO 3166-1 alpha-2: two capital letters. */
    private static final Pattern COUNTRY_CODE = Pattern.compile("^[A-Z]{2}$");

    private static final int MAX_DAYS = 3650;

    private final CountryRepository countryRepository;
    private final RegulationCatalogRepository catalogRepository;
    private final RegulationVersionRepository versionRepository;
    private final RegulationRuleRepository ruleRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final JobRegulationPinRepository jobRegulationPinRepository;
    private final AuditService auditService;

    public RegulationService(
            CountryRepository countryRepository,
            RegulationCatalogRepository catalogRepository,
            RegulationVersionRepository versionRepository,
            RegulationRuleRepository ruleRepository,
            DocumentTypeRepository documentTypeRepository,
            JobRegulationPinRepository jobRegulationPinRepository,
            AuditService auditService) {
        this.countryRepository = countryRepository;
        this.catalogRepository = catalogRepository;
        this.versionRepository = versionRepository;
        this.ruleRepository = ruleRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.jobRegulationPinRepository = jobRegulationPinRepository;
        this.auditService = auditService;
    }

    /**
     * Every country we serve, by name, with its regulation catalog (its published version, its draft and its version
     * history), or none yet. A fixed number of queries, however many countries and versions there are.
     */
    @Transactional(readOnly = true)
    public List<RegulationCountryResponse> listCountries() {
        List<Country> countries = countryRepository.findAll(Sort.by("name"));
        Map<UUID, RegulationCatalog> catalogByCountry = catalogRepository.findAll().stream()
                .collect(Collectors.toMap(c -> c.getCountry().getId(), Function.identity()));
        Map<UUID, List<RegulationVersion>> versionsByCatalog =
                versionRepository.findAllByOrderByVersionNoDesc().stream()
                        .collect(Collectors.groupingBy(v -> v.getCatalog().getId()));
        Map<UUID, Long> pinned = jobRegulationPinRepository.countPinsByVersion().stream()
                .collect(Collectors.toMap(
                        JobRegulationPinRepository.VersionPinCount::getVersionId,
                        JobRegulationPinRepository.VersionPinCount::getPinned));

        return countries.stream()
                .map(country -> {
                    RegulationCatalog catalog = catalogByCountry.get(country.getId());
                    RegulationCatalogResponse catalogResponse = catalog == null
                            ? null
                            : ClearanceMapper.toCatalogResponse(
                                    catalog,
                                    country.getCode(),
                                    versionsByCatalog.getOrDefault(catalog.getId(), List.of()),
                                    pinned);
                    return ClearanceMapper.toCountryResponse(country, catalogResponse);
                })
                .toList();
    }

    /**
     * Add a country we serve (US-F2-12). Its code is ISO 3166-1 alpha-2 and can't be added twice; the catalog comes
     * next, from {@link #createCatalog}.
     */
    @Transactional
    public RegulationCountryResponse addCountry(CountryRequest request, User user) {
        String code = request.code() == null ? "" : request.code().trim().toUpperCase(Locale.ROOT);
        String name = request.name() == null ? "" : request.name().trim();
        if (!COUNTRY_CODE.matcher(code).matches()) {
            throw new BusinessException(String.format(
                    "A country code is the two-letter ISO 3166-1 code, such as US for the United States; \"%s\" isn't one.",
                    request.code() == null ? "" : request.code().trim()));
        }
        if (name.isEmpty() || name.length() > 80) {
            throw new BusinessException("Enter the country's name, at most 80 characters.");
        }
        countryRepository.findByCode(code).ifPresent(existing -> {
            throw new ConflictException(
                    "COUNTRY_EXISTS",
                    String.format("%s is already a country we serve, as %s.", code, existing.getName()));
        });

        Country country = new Country();
        country.setCode(code);
        country.setName(name);
        Country saved;
        try {
            saved = countryRepository.saveAndFlush(country);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("COUNTRY_EXISTS", code + " is already a country we serve.");
        }

        auditService.recordDecision(
                user,
                "COUNTRY_ADDED",
                String.format("Added %s (%s) to the countries we serve.", name, code),
                "COUNTRY",
                saved.getId(),
                code,
                null,
                null,
                null);
        return ClearanceMapper.toCountryResponse(saved, null);
    }

    /**
     * Create a country's regulation catalog ("United States import") with its first version as a draft, holding the
     * given lead times, quarantine minimum and arrival buffer and no rules yet. A country has one catalog.
     */
    @Transactional
    public RegulationVersionResponse createCatalog(UUID countryId, RegulationParametersRequest request, User user) {
        Country country = countryRepository
                .findById(countryId)
                .orElseThrow(() -> ResourceNotFoundException.of("Country", countryId));
        if (catalogRepository.existsByCountryId(countryId)) {
            throw new ConflictException(
                    "CATALOG_EXISTS",
                    String.format(
                            "%s already has a regulation catalog. Create a draft version of it instead.",
                            country.getName()));
        }
        validateParameters(request);

        RegulationCatalog catalog = new RegulationCatalog();
        catalog.setCountry(country);
        catalog.setName(country.getName() + " import");
        RegulationCatalog savedCatalog;
        try {
            savedCatalog = catalogRepository.saveAndFlush(catalog);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(
                    "CATALOG_EXISTS", String.format("%s already has a regulation catalog.", country.getName()));
        }

        RegulationVersion draft = new RegulationVersion();
        draft.setCatalog(savedCatalog);
        draft.setVersionNo(1);
        draft.setStatus(CatalogStatus.DRAFT);
        applyParameters(draft, request);
        RegulationVersion savedDraft = versionRepository.save(draft);

        auditService.recordDecision(
                user,
                "CATALOG_CREATED",
                String.format("Created the %s regulation catalog with draft version 1.", country.getName()),
                "REGULATION_VERSION",
                savedDraft.getId(),
                versionCode(savedDraft),
                null,
                null,
                "DRAFT");
        return getVersionDetails(savedDraft.getId());
    }

    /**
     * Get detailed information for a regulation version, including all document rules with diff status. A draft is
     * compared with the published version: new, changed and removed rules and changed parameters each count as one
     * change.
     */
    @Transactional(readOnly = true)
    public RegulationVersionResponse getVersionDetails(UUID versionId) {
        RegulationVersion version = findVersion(versionId);
        List<RegulationRule> rules = ruleRepository.findByVersionId(versionId);

        RegulationVersion published = null;
        Map<UUID, RegulationRule> publishedRules = new HashMap<>();
        if (version.getStatus() == CatalogStatus.DRAFT) {
            published = latestPublished(version.getCatalog().getId());
            if (published != null) {
                for (RegulationRule pr : ruleRepository.findByVersionId(published.getId())) {
                    publishedRules.put(pr.getDocumentType().getId(), pr);
                }
            }
        }

        int changesCount = 0;
        List<RegulationRuleResponse> ruleResponses = new ArrayList<>();
        for (RegulationRule r : rules) {
            String diff = "UNCHANGED";
            String parameter = ClearanceMapper.parameterText(r);
            if (version.getStatus() == CatalogStatus.DRAFT) {
                RegulationRule base = publishedRules.remove(r.getDocumentType().getId());
                if (base == null) {
                    diff = "NEW";
                    changesCount++;
                } else if (r.getRuleKind() != base.getRuleKind()
                        || !Objects.equals(r.getMinDays(), base.getMinDays())
                        || !Objects.equals(r.getMaxDays(), base.getMaxDays())
                        || r.isMandatory() != base.isMandatory()) {
                    diff = "CHANGED";
                    changesCount++;
                    String was = ClearanceMapper.parameterText(base);
                    if (!was.equals(parameter)) {
                        parameter = parameter + " (was " + was + ")";
                    }
                }
            }
            ruleResponses.add(ClearanceMapper.toRuleResponse(r, diff, parameter));
        }
        if (published != null) {
            // What is left of the published rules was removed from the draft.
            changesCount += publishedRules.size()
                    + changedParameters(published, version).size();
        }

        int pinned = (int) jobRegulationPinRepository.countByRegulationVersionIdAndSupersededAtIsNull(versionId);
        return ClearanceMapper.toVersionResponse(version, pinned, ruleResponses, changesCount);
    }

    /**
     * List all recognized document types in the system.
     */
    @Transactional(readOnly = true)
    public List<DocumentTypeResponse> listDocumentTypes() {
        return documentTypeRepository.findAll().stream()
                .map(ClearanceMapper::toDocumentTypeResponse)
                .toList();
    }

    /**
     * Change a draft version's lead times, quarantine minimum and arrival buffer. A published version never changes.
     */
    @Transactional
    public RegulationVersionResponse updateParameters(UUID versionId, RegulationParametersRequest request, User user) {
        RegulationVersion version = findVersion(versionId);
        requireDraft(version);
        validateParameters(request);

        RegulationVersion before = new RegulationVersion();
        applyParameters(before, parametersOf(version));
        applyParameters(version, request);
        List<String> changed = changedParameters(before, version);
        if (changed.isEmpty()) {
            return getVersionDetails(versionId);
        }
        versionRepository.save(version);

        auditService.recordDecision(
                user,
                "CATALOG_DRAFT_CHANGED",
                String.format(
                        "Changed %s in draft v%d of the %s.",
                        String.join(", ", changed), version.getVersionNo(), catalogTitle(version)),
                "REGULATION_VERSION",
                version.getId(),
                versionCode(version),
                null,
                null,
                null);
        return getVersionDetails(versionId);
    }

    /**
     * Add a document rule to a draft version. A document type has at most one rule in a version.
     */
    @Transactional
    public RegulationVersionResponse addRule(UUID versionId, RegulationRuleRequest request, User user) {
        RegulationVersion version = findVersion(versionId);
        requireDraft(version);
        DocumentType documentType = documentTypeRepository
                .findById(request.documentTypeId())
                .orElseThrow(() -> ResourceNotFoundException.of("DocumentType", request.documentTypeId()));
        if (ruleRepository.existsByVersionIdAndDocumentTypeId(versionId, documentType.getId())) {
            throw new ConflictException(
                    "RULE_EXISTS",
                    String.format(
                            "Draft v%d already has a rule for %s. Edit that rule instead.",
                            version.getVersionNo(), documentType.getName()));
        }

        RegulationRule rule = new RegulationRule();
        rule.setVersion(version);
        rule.setDocumentType(documentType);
        applyRule(
                rule,
                request.ruleKind(),
                request.minDays(),
                request.maxDays(),
                request.mandatory(),
                request.description());
        try {
            ruleRepository.saveAndFlush(rule);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(
                    "RULE_EXISTS",
                    String.format(
                            "Draft v%d already has a rule for %s.", version.getVersionNo(), documentType.getName()));
        }

        auditService.recordDecision(
                user,
                "CATALOG_RULE_ADDED",
                String.format(
                        "Added the %s rule (%s) to draft v%d of the %s.",
                        documentType.getName(),
                        ClearanceMapper.parameterText(rule),
                        version.getVersionNo(),
                        catalogTitle(version)),
                "REGULATION_VERSION",
                version.getId(),
                versionCode(version),
                null,
                null,
                ClearanceMapper.parameterText(rule));
        return getVersionDetails(versionId);
    }

    /**
     * Update an individual regulation rule in a draft version.
     */
    @Transactional
    public RegulationVersionResponse updateRule(UUID ruleId, RegulationRuleUpdateRequest request, User user) {
        RegulationRule rule = findRule(ruleId);
        RegulationVersion version = rule.getVersion();
        requireDraft(version);

        String before = ClearanceMapper.parameterText(rule) + (rule.isMandatory() ? ", blocks" : ", optional");
        applyRule(
                rule,
                request.ruleKind(),
                request.minDays(),
                request.maxDays(),
                request.mandatory(),
                request.description());
        ruleRepository.save(rule);
        String after = ClearanceMapper.parameterText(rule) + (rule.isMandatory() ? ", blocks" : ", optional");

        auditService.recordDecision(
                user,
                "CATALOG_RULE_CHANGED",
                String.format(
                        "Changed the %s rule in draft v%d of the %s.",
                        rule.getDocumentType().getName(), version.getVersionNo(), catalogTitle(version)),
                "REGULATION_VERSION",
                version.getId(),
                versionCode(version),
                null,
                before,
                after);
        return getVersionDetails(version.getId());
    }

    /**
     * Remove a document rule from a draft version. The published version keeps it until the draft is published.
     */
    @Transactional
    public RegulationVersionResponse removeRule(UUID ruleId, User user) {
        RegulationRule rule = findRule(ruleId);
        RegulationVersion version = rule.getVersion();
        requireDraft(version);

        String documentName = rule.getDocumentType().getName();
        String parameter = ClearanceMapper.parameterText(rule);
        ruleRepository.delete(rule);
        ruleRepository.flush();

        auditService.recordDecision(
                user,
                "CATALOG_RULE_REMOVED",
                String.format(
                        "Removed the %s rule from draft v%d of the %s.",
                        documentName, version.getVersionNo(), catalogTitle(version)),
                "REGULATION_VERSION",
                version.getId(),
                versionCode(version),
                null,
                parameter,
                null);
        return getVersionDetails(version.getId());
    }

    /**
     * Discard an existing draft regulation version.
     */
    @Transactional
    public void discardDraft(UUID versionId, User user) {
        RegulationVersion version = findVersion(versionId);
        if (version.getStatus() != CatalogStatus.DRAFT) {
            throw new ConflictException("VERSION_NOT_DRAFT", "Only draft versions can be discarded.");
        }
        String code = versionCode(version);
        String title = catalogTitle(version);

        versionRepository.delete(version);

        auditService.recordDecision(
                user,
                "CATALOG_DRAFT_DISCARDED",
                String.format("Discarded draft version %d of the %s.", version.getVersionNo(), title),
                "REGULATION_VERSION",
                version.getId(),
                code,
                null,
                "DRAFT",
                null);
    }

    /**
     * Create a new draft regulation version cloned from the currently published version. A catalog with no published
     * version starts its draft from the default parameters and no rules.
     */
    @Transactional
    public RegulationVersionResponse createDraft(UUID catalogId, User user) {
        RegulationCatalog catalog = catalogRepository
                .findById(catalogId)
                .orElseThrow(() -> ResourceNotFoundException.of("RegulationCatalog", catalogId));

        Optional<RegulationVersion> existingDraft =
                versionRepository.findByCatalogIdAndStatus(catalogId, CatalogStatus.DRAFT);
        if (existingDraft.isPresent()) {
            return getVersionDetails(existingDraft.get().getId());
        }

        RegulationVersion active = latestPublished(catalogId);
        int nextVersionNo = versionRepository.findByCatalogId(catalogId).stream()
                        .mapToInt(RegulationVersion::getVersionNo)
                        .max()
                        .orElse(0)
                + 1;

        RegulationVersion newDraft = new RegulationVersion();
        newDraft.setCatalog(catalog);
        newDraft.setVersionNo(nextVersionNo);
        newDraft.setStatus(CatalogStatus.DRAFT);
        applyParameters(
                newDraft,
                active != null
                        ? parametersOf(active)
                        : new RegulationParametersRequest((short) 21, (short) 3, (short) 7, (short) 2));

        RegulationVersion savedDraft = versionRepository.save(newDraft);

        // Clone rules from active version if present
        if (active != null) {
            List<RegulationRule> activeRules = ruleRepository.findByVersionId(active.getId());
            for (RegulationRule ar : activeRules) {
                RegulationRule cloned = new RegulationRule();
                cloned.setVersion(savedDraft);
                cloned.setDocumentType(ar.getDocumentType());
                cloned.setRuleKind(ar.getRuleKind());
                cloned.setMandatory(ar.isMandatory());
                cloned.setMinDays(ar.getMinDays());
                cloned.setMaxDays(ar.getMaxDays());
                cloned.setDescription(ar.getDescription());
                ruleRepository.save(cloned);
            }
        }

        auditService.recordDecision(
                user,
                "CATALOG_DRAFT_CREATED",
                String.format("Created draft version %d of the %s.", nextVersionNo, catalogTitle(savedDraft)),
                "REGULATION_VERSION",
                savedDraft.getId(),
                versionCode(savedDraft),
                null,
                null,
                "DRAFT");

        return getVersionDetails(savedDraft.getId());
    }

    /**
     * Publish a draft regulation version (DRAFT -> PUBLISHED). Retires the previously active published version and
     * writes an audit log entry. A version without rules can't be published: it would clear every job into the
     * country without checking a document. Jobs keep the version they were pinned to.
     */
    @Transactional
    public RegulationVersionResponse publishVersion(UUID versionId, User publisher) {
        RegulationVersion version = findVersion(versionId);
        if (version.getStatus() != CatalogStatus.DRAFT) {
            throw new ConflictException("VERSION_NOT_DRAFT", "Only draft regulation versions can be published.");
        }
        if (ruleRepository.countByVersionId(versionId) == 0) {
            throw new ConflictException(
                    "VERSION_HAS_NO_RULES",
                    String.format(
                            "Draft v%d of the %s has no document rules. Add at least one before publishing it.",
                            version.getVersionNo(), catalogTitle(version)));
        }

        // Retire previously published versions for this catalog
        List<RegulationVersion> activeVersions = versionRepository.findByCatalogIdAndStatusOrdered(
                version.getCatalog().getId(), CatalogStatus.PUBLISHED);
        for (RegulationVersion v : activeVersions) {
            v.setStatus(CatalogStatus.RETIRED);
            versionRepository.save(v);
        }

        version.setStatus(CatalogStatus.PUBLISHED);
        version.setPublishedAt(Instant.now());
        version.setPublishedBy(publisher);

        RegulationVersion saved = versionRepository.save(version);

        // Record audit decision (BR-F1-08)
        auditService.recordDecision(
                publisher,
                "CATALOG_PUBLISHED",
                String.format("Published version %d of the %s.", version.getVersionNo(), catalogTitle(version)),
                "REGULATION_VERSION",
                saved.getId(),
                versionCode(saved),
                null,
                "DRAFT",
                "PUBLISHED");

        return getVersionDetails(saved.getId());
    }

    private RegulationVersion findVersion(UUID versionId) {
        return versionRepository
                .findById(versionId)
                .orElseThrow(() -> ResourceNotFoundException.of("RegulationVersion", versionId));
    }

    private RegulationRule findRule(UUID ruleId) {
        return ruleRepository
                .findById(ruleId)
                .orElseThrow(() -> ResourceNotFoundException.of("RegulationRule", ruleId));
    }

    private RegulationVersion latestPublished(UUID catalogId) {
        List<RegulationVersion> published =
                versionRepository.findByCatalogIdAndStatusOrdered(catalogId, CatalogStatus.PUBLISHED);
        return published.isEmpty() ? null : published.get(0);
    }

    /** Published and retired versions are immutable (BR-F2-01): their rules and parameters never change. */
    private static void requireDraft(RegulationVersion version) {
        if (version.getStatus() != CatalogStatus.DRAFT) {
            throw new ConflictException(
                    "VERSION_NOT_DRAFT",
                    String.format(
                            "Version %d of the %s is %s, so it can't change. Create a draft version and edit that.",
                            version.getVersionNo(),
                            catalogTitle(version),
                            version.getStatus() == CatalogStatus.PUBLISHED ? "published" : "retired"));
        }
    }

    /** "KH v8": the entity code of a version in the audit log. */
    private static String versionCode(RegulationVersion version) {
        return version.getCatalog().getCountry().getCode() + " v" + version.getVersionNo();
    }

    /** "Cambodia regulation catalog". */
    private static String catalogTitle(RegulationVersion version) {
        return version.getCatalog().getCountry().getName() + " regulation catalog";
    }

    private static void validateParameters(RegulationParametersRequest p) {
        requireDays("The cross-border lead time", p.leadTimeDays(), 1, 365);
        requireDays("The domestic lead time", p.domesticLeadTimeDays(), 1, 365);
        requireDays("The quarantine minimum", p.quarantineMinDays(), 0, 365);
        requireDays("The arrival buffer", p.arrivalBufferDays(), 0, 365);
    }

    private static void requireDays(String what, Short value, int min, int max) {
        if (value == null) {
            throw new BusinessException(what + " is required, in days.");
        }
        if (value < min || value > max) {
            throw new BusinessException(
                    String.format("%s is %d to %d days; %d isn't in that range.", what, min, max, value));
        }
    }

    private static RegulationParametersRequest parametersOf(RegulationVersion v) {
        return new RegulationParametersRequest(
                v.getLeadTimeDays(), v.getDomesticLeadTimeDays(), v.getQuarantineMinDays(), v.getArrivalBufferDays());
    }

    private static void applyParameters(RegulationVersion v, RegulationParametersRequest p) {
        v.setLeadTimeDays(p.leadTimeDays());
        v.setDomesticLeadTimeDays(p.domesticLeadTimeDays());
        v.setQuarantineMinDays(p.quarantineMinDays());
        v.setArrivalBufferDays(p.arrivalBufferDays());
    }

    /** "lead time 21 → 30 d", one entry for each parameter that differs. */
    private static List<String> changedParameters(RegulationVersion before, RegulationVersion after) {
        List<String> changed = new ArrayList<>();
        diff(changed, "lead time", before.getLeadTimeDays(), after.getLeadTimeDays());
        diff(changed, "domestic lead time", before.getDomesticLeadTimeDays(), after.getDomesticLeadTimeDays());
        diff(changed, "quarantine minimum", before.getQuarantineMinDays(), after.getQuarantineMinDays());
        diff(changed, "arrival buffer", before.getArrivalBufferDays(), after.getArrivalBufferDays());
        return changed;
    }

    private static void diff(List<String> changed, String what, short before, short after) {
        if (before != after) {
            changed.add(String.format("%s %d → %d d", what, before, after));
        }
    }

    /**
     * Checks a rule's days against its kind before anything changes, then sets them. A window before departure and
     * "valid until arrival plus" take only {@code maxDays}; a booster window takes both, nearest first; presence only
     * takes none.
     */
    private static void applyRule(
            RegulationRule rule,
            RegulationRuleKind kind,
            Short minDays,
            Short maxDays,
            Boolean mandatory,
            String description) {
        if (kind == null) {
            throw new BusinessException("Choose the rule shape.");
        }
        String text = description == null ? null : description.trim();
        if (text != null && text.length() > 500) {
            throw new BusinessException("A rule's description is at most 500 characters.");
        }
        Short min = null;
        Short max = null;
        switch (kind) {
            case WINDOW_BEFORE_DEPARTURE -> max = requireRuleDays("Days before departure", maxDays, 1);
            case VALID_THROUGH_ARRIVAL_PLUS -> max = requireRuleDays("Days after arrival", maxDays, 0);
            case BOOSTER_WINDOW -> {
                max = requireRuleDays("The most days before departure", maxDays, 1);
                min = minDays == null ? 0 : requireRuleDays("The fewest days before departure", minDays, 0);
                if (min > max) {
                    throw new BusinessException(String.format(
                            "A booster window is given %d to %d days before departure: the fewest days can't be more than the most.",
                            min, max));
                }
            }
            case PRESENCE_ONLY -> {}
        }
        rule.setRuleKind(kind);
        rule.setMinDays(min);
        rule.setMaxDays(max);
        rule.setMandatory(mandatory == null || mandatory);
        rule.setDescription(text == null || text.isEmpty() ? null : text);
    }

    private static Short requireRuleDays(String what, Short value, int min) {
        if (value == null) {
            throw new BusinessException(what + " is required for this rule shape.");
        }
        if (value < min || value > MAX_DAYS) {
            throw new BusinessException(
                    String.format("%s is %d to %d; %d isn't in that range.", what, min, MAX_DAYS, value));
        }
        return value;
    }
}
