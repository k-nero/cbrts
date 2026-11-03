package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.CatalogMoveRequest;
import com.equifreight.model.clearance.CatalogUpdateResponse;
import com.equifreight.model.clearance.ChecklistItemResponse;
import com.equifreight.model.clearance.ClearanceMapper;
import com.equifreight.repository.*;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A job keeps the regulation versions it was pinned to (BR-F2-01) until the transport specialist moves it onto a newer
 * published one: a later change never silently alters an in-flight case (PRODUCT.md), it is flagged and applied on
 * purpose. Moving adds the documents the new version asks for, checks the kept ones against its rules and drops the
 * ones it no longer lists, keeping every uploaded file.
 */
@Service
public class CatalogUpdateService {

    private final ClearanceService clearance;
    private final TransportJobRepository jobs;
    private final JobRegulationPinRepository pins;
    private final RegulationVersionRepository versions;
    private final RegulationRuleRepository rules;
    private final ChecklistItemRepository items;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public CatalogUpdateService(
            ClearanceService clearance,
            TransportJobRepository jobs,
            JobRegulationPinRepository pins,
            RegulationVersionRepository versions,
            RegulationRuleRepository rules,
            ChecklistItemRepository items,
            AuditService audit,
            NotificationService notifications,
            Clock clock) {
        this.clearance = clearance;
        this.jobs = jobs;
        this.pins = pins;
        this.versions = versions;
        this.rules = rules;
        this.items = items;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    /** The newer published versions of the job's pinned catalogs; none once the horses have left. */
    @Transactional(readOnly = true)
    public List<CatalogUpdateResponse> updatesFor(UUID jobId) {
        TransportJob job = findJob(jobId);
        if (clearance.frozen(job)) {
            return List.of();
        }
        return pins.findByJobIdAndSupersededAtIsNull(jobId).stream()
                .flatMap(pin -> newerVersion(pin).map(v -> difference(pin, v)).stream())
                .toList();
    }

    /**
     * Moves the job onto a newer published version of one of its catalogs. The old pin stays as history; items are
     * added, re-pointed or dropped, never deleted; every uploaded document is checked again and the gate re-run.
     */
    @Transactional
    public List<ChecklistItemResponse> moveToVersion(UUID jobId, CatalogMoveRequest request, User specialist) {
        TransportJob job = findJob(jobId);
        if (clearance.frozen(job)) {
            throw new ConflictException(
                    "JOB_DEPARTED", "The horses have left, so the job's regulation catalog can't change.");
        }
        RegulationVersion target = versions.findById(request.versionId())
                .orElseThrow(() -> ResourceNotFoundException.of("RegulationVersion", request.versionId()));
        if (target.getStatus() != CatalogStatus.PUBLISHED) {
            throw new ConflictException(
                    "VERSION_NOT_PUBLISHED", "A job can move only onto its catalog's published version.");
        }
        List<JobRegulationPin> inForce = pins.findByJobIdAndSupersededAtIsNull(jobId);
        JobRegulationPin old = inForce.stream()
                .filter(p -> sameCatalog(p.getRegulationVersion(), target))
                .findFirst()
                .orElseThrow(() -> new ConflictException(
                        "CATALOG_NOT_PINNED", "The job isn't pinned to the " + countryOf(target) + " catalog."));
        if (target.getVersionNo() <= old.getRegulationVersion().getVersionNo()) {
            throw new ConflictException(
                    "VERSION_NOT_NEWER",
                    "The job is already on " + label(old.getRegulationVersion()) + "; it moves only to a newer one.");
        }
        CatalogUpdateResponse change = difference(old, target);

        Instant now = clock.instant();
        old.setSupersededAt(now);
        pins.save(old);
        JobRegulationPin next = new JobRegulationPin();
        next.setJob(job);
        next.setRegulationVersion(target);
        next.setRole(old.getRole());
        pins.save(next);

        List<JobRegulationPin> nowInForce = new ArrayList<>(inForce);
        nowInForce.replaceAll(p -> p == old ? next : p);
        List<RegulationRule> governing = clearance.governingRules(nowInForce);
        Map<UUID, RegulationRule> ruleByType = governing.stream()
                .collect(Collectors.toMap(r -> r.getDocumentType().getId(), Function.identity()));

        List<ChecklistItem> kept = items.findByJobId(jobId);
        for (ChecklistItem item : kept) {
            RegulationRule rule = ruleByType.get(item.getDocumentType().getId());
            if (rule == null) {
                if (item.getDroppedAt() == null) {
                    item.setDroppedAt(now);
                    item.setHolder(null);
                }
            } else {
                item.setRegulationRule(rule);
                if (item.getDroppedAt() != null) {
                    item.setDroppedAt(null);
                    item.setHolder(holderOf(item));
                }
            }
        }
        items.saveAll(kept);
        List<ChecklistItem> added = clearance.missingItems(job, governing, true);
        items.saveAll(added);

        // Validity under the new rules, then the gate.
        clearance.recheckJobDocuments(jobId);

        audit.recordDecision(
                specialist,
                "CATALOG_UPDATE_APPLIED",
                "Moved %s from %s to %s: %d added, %d changed, %d removed."
                        .formatted(
                                job.getCode(),
                                label(old.getRegulationVersion()),
                                label(target),
                                change.added().size(),
                                change.changed().size(),
                                change.removed().size()),
                "TRANSPORT_JOB",
                job.getId(),
                job.getCode(),
                request.reason(),
                label(old.getRegulationVersion()),
                label(target));

        List<String> owed = added.stream()
                .filter(i -> i.getHolder() == ChecklistHolder.CUSTOMER)
                .map(i -> i.getDocumentType().getName())
                .distinct()
                .toList();
        if (!owed.isEmpty() && job.getRequest() != null && job.getRequest().getClub() != null) {
            notifications.notify(
                    NotificationKind.DOCUMENTS_DUE,
                    Audience.club(job.getRequest().getClub().getId()),
                    Subject.documents(job),
                    "New documents needed for " + job.getCode(),
                    countryOf(target) + " changed its import rules, so " + job.getCode() + " now needs: "
                            + String.join(", ", owed) + ". Upload them on the job's documents.");
        }

        return items.findByJobId(jobId).stream()
                .map(ClearanceMapper::toItemResponse)
                .toList();
    }

    private Optional<RegulationVersion> newerVersion(JobRegulationPin pin) {
        RegulationVersion pinned = pin.getRegulationVersion();
        return versions.findByCatalogIdAndStatus(pinned.getCatalog().getId(), CatalogStatus.PUBLISHED)
                .filter(v -> v.getVersionNo() > pinned.getVersionNo());
    }

    /** What moving the pin onto {@code target} adds, changes and removes, document by document. */
    CatalogUpdateResponse difference(JobRegulationPin pin, RegulationVersion target) {
        RegulationVersion pinned = pin.getRegulationVersion();
        Map<UUID, RegulationRule> before = byDocument(rules.findByVersionId(pinned.getId()));
        Map<UUID, RegulationRule> after = byDocument(rules.findByVersionId(target.getId()));
        List<String> added = new ArrayList<>();
        List<String> changed = new ArrayList<>();
        for (RegulationRule now : after.values()) {
            RegulationRule was = before.get(now.getDocumentType().getId());
            if (was == null) {
                added.add(now.getDocumentType().getName());
            } else if (!ruleText(was).equals(ruleText(now))) {
                changed.add(now.getDocumentType().getName() + ": " + ruleText(was) + " → " + ruleText(now));
            }
        }
        List<String> removed = before.values().stream()
                .filter(r -> !after.containsKey(r.getDocumentType().getId()))
                .map(r -> r.getDocumentType().getName())
                .toList();
        return CatalogUpdateResponse.builder()
                .role(pin.getRole())
                .country(countryOf(target))
                .pinnedVersionId(pinned.getId())
                .pinnedVersionNo(pinned.getVersionNo())
                .versionId(target.getId())
                .versionNo(target.getVersionNo())
                .publishedAt(target.getPublishedAt())
                .added(added)
                .changed(changed)
                .removed(removed)
                .build();
    }

    /** Rules by document, in a stable order so the lists read the same every time. */
    private static Map<UUID, RegulationRule> byDocument(List<RegulationRule> list) {
        Map<UUID, RegulationRule> byType = new LinkedHashMap<>();
        list.stream()
                .sorted(Comparator.comparing(r -> r.getDocumentType().getName()))
                .forEach(r -> byType.putIfAbsent(r.getDocumentType().getId(), r));
        return byType;
    }

    /** "within 45 d, mandatory": what a specialist compares between two versions of a rule. */
    private static String ruleText(RegulationRule rule) {
        return ClearanceMapper.parameterText(rule) + ", " + (rule.isMandatory() ? "mandatory" : "optional");
    }

    /** Who acts next on an item a newer version lists again, from where it stands. */
    private static ChecklistHolder holderOf(ChecklistItem item) {
        boolean customerProvides = item.getDocumentType().getProvidedBy() == DocumentProvider.CUSTOMER;
        return switch (item.getStatus()) {
            case CLEARED -> null;
            case IN_REVIEW, WITH_AUTHORITY -> ChecklistHolder.SPECIALIST;
            default -> customerProvides ? ChecklistHolder.CUSTOMER : ChecklistHolder.SPECIALIST;
        };
    }

    private static boolean sameCatalog(RegulationVersion a, RegulationVersion b) {
        return a.getCatalog().getId().equals(b.getCatalog().getId());
    }

    private static String countryOf(RegulationVersion version) {
        return version.getCatalog().getCountry().getName();
    }

    private static String label(RegulationVersion version) {
        return countryOf(version) + " v" + version.getVersionNo();
    }

    private TransportJob findJob(UUID jobId) {
        return jobs.findById(jobId).orElseThrow(() -> ResourceNotFoundException.of("TransportJob", jobId));
    }
}
