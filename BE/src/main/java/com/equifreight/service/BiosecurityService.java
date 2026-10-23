package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.DocumentCategory;
import com.equifreight.entity.enums.Validity;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.job.BiosecurityWarningResponse;
import com.equifreight.repository.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Biosecurity warnings for horses sharing a trailer (US-F3-12, docs/shared-trips-design.md "Health status"). Health
 * status is never typed in: it is derived from each job's quarantine periods and clearance checklist. Every pair of
 * jobs on a trailer is compared for three differences: an isolation mismatch, different health tests required, and
 * health documents not yet clear. The warnings don't block; the coordinator accepts them, and an accepted warning
 * isn't asked again until what it says changes. The departure gate is unchanged.
 */
@Service
public class BiosecurityService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);

    private final JobTripService jobTrips;
    private final LoadPlanRepository loadPlans;
    private final LoadPlanStallRepository placements;
    private final ChecklistItemRepository checklist;
    private final QuarantinePeriodRepository quarantine;
    private final TripWarningAcceptanceRepository acceptances;
    private final AuditService audit;
    private final Clock clock;

    public BiosecurityService(
            JobTripService jobTrips,
            LoadPlanRepository loadPlans,
            LoadPlanStallRepository placements,
            ChecklistItemRepository checklist,
            QuarantinePeriodRepository quarantine,
            TripWarningAcceptanceRepository acceptances,
            AuditService audit,
            Clock clock) {
        this.jobTrips = jobTrips;
        this.loadPlans = loadPlans;
        this.placements = placements;
        this.checklist = checklist;
        this.quarantine = quarantine;
        this.acceptances = acceptances;
        this.audit = audit;
        this.clock = clock;
    }

    /** A horse riding under a job. */
    private record Rider(TransportJob job, Horse horse) {}

    /** A warning before its accepted flag is known. */
    private record Warning(String key, String kind, List<String> jobCodes, List<String> horses, String message) {}

    /**
     * The warnings if {@code joining} joined the trip (US-F3-11): its horses compared with every horse on the trip,
     * since nothing is placed on a trailer yet.
     */
    @Transactional(readOnly = true)
    public List<BiosecurityWarningResponse> forJoin(Trip trip, TransportJob joining) {
        List<Rider> riders = new ArrayList<>();
        jobTrips.horsesOn(trip).forEach(th -> riders.add(new Rider(th.getJob(), th.getHorse())));
        joining.getRequest().getHorses().forEach(rh -> riders.add(new Rider(joining, rh.getHorse())));
        return withAccepted(trip, compare(trip, List.of(riders)));
    }

    /**
     * The trip's warnings now: per trailer from its placements; a trip with one trailer, or none yet, compares every
     * horse on it.
     */
    @Transactional(readOnly = true)
    public List<BiosecurityWarningResponse> forTrip(Trip trip) {
        return withAccepted(trip, compare(trip, groups(trip)));
    }

    private List<List<Rider>> groups(Trip trip) {
        List<TripHorse> onTrip = jobTrips.horsesOn(trip);
        List<LoadPlan> plans = loadPlans.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId());
        if (plans.size() <= 1) {
            return List.of(onTrip.stream()
                    .map(th -> new Rider(th.getJob(), th.getHorse()))
                    .toList());
        }
        Map<UUID, TransportJob> jobOf = new HashMap<>();
        onTrip.forEach(th -> jobOf.put(th.getHorse().getId(), th.getJob()));
        List<List<Rider>> groups = new ArrayList<>();
        for (LoadPlan plan : plans) {
            groups.add(placements.findByLoadPlanId(plan.getId()).stream()
                    .filter(lps -> jobOf.containsKey(lps.getHorse().getId()))
                    .map(lps -> new Rider(jobOf.get(lps.getHorse().getId()), lps.getHorse()))
                    .toList());
        }
        return groups;
    }

    private List<Warning> compare(Trip trip, List<List<Rider>> groups) {
        Map<String, Warning> found = new LinkedHashMap<>();
        Map<UUID, List<QuarantinePeriod>> periods = new HashMap<>();
        Map<UUID, List<ChecklistItem>> items = new HashMap<>();
        for (List<Rider> group : groups) {
            List<TransportJob> jobs = group.stream()
                    .map(Rider::job)
                    .collect(Collectors.toMap(TransportJob::getId, j -> j, (a, b) -> a, LinkedHashMap::new))
                    .values()
                    .stream()
                    .toList();
            if (jobs.size() < 2) continue;
            for (TransportJob job : jobs) {
                periods.computeIfAbsent(job.getId(), quarantine::findByJobId);
                items.computeIfAbsent(job.getId(), checklist::findByJobId);
            }
            for (int i = 0; i < jobs.size(); i++) {
                for (int k = i + 1; k < jobs.size(); k++) {
                    TransportJob a = jobs.get(i);
                    TransportJob b = jobs.get(k);
                    isolation(trip, a, b, group, periods).ifPresent(w -> found.putIfAbsent(w.key(), w));
                    healthTests(a, b, items).ifPresent(w -> found.putIfAbsent(w.key(), w));
                }
            }
            for (TransportJob job : jobs) {
                healthDocuments(job, group, items).ifPresent(w -> found.putIfAbsent(w.key(), w));
            }
        }
        return List.copyOf(found.values());
    }

    /** Where and until when a horse was isolated for this move; empty when it wasn't. */
    private static String isolationOf(Rider rider, Map<UUID, List<QuarantinePeriod>> periods) {
        return periods.getOrDefault(rider.job().getId(), List.of()).stream()
                .filter(q -> q.getHorse() == null
                        || q.getHorse().getId().equals(rider.horse().getId()))
                .sorted(Comparator.comparing(QuarantinePeriod::getEndsOn))
                .map(q -> "isolated at " + q.getPlace().getName() + " until "
                        + q.getEndsOn().format(DAY))
                .collect(Collectors.joining(", "));
    }

    /** 1. Horses from different isolation groups, or isolated horses with ones that weren't. */
    private Optional<Warning> isolation(
            Trip trip, TransportJob a, TransportJob b, List<Rider> group, Map<UUID, List<QuarantinePeriod>> periods) {
        List<Rider> pair =
                group.stream().filter(r -> r.job() == a || r.job() == b).toList();
        Map<String, List<Rider>> byIsolation = new LinkedHashMap<>();
        for (Rider r : pair)
            byIsolation
                    .computeIfAbsent(isolationOf(r, periods), x -> new ArrayList<>())
                    .add(r);
        if (byIsolation.size() < 2) return Optional.empty();
        List<String> parts = new ArrayList<>();
        for (Map.Entry<String, List<Rider>> e : byIsolation.entrySet()) {
            List<Rider> riders = e.getValue();
            if (e.getKey().isEmpty()) {
                TransportJob job = riders.getFirst().job();
                boolean wholeJob = riders.stream().allMatch(r -> r.job() == job)
                        && riders.size()
                                == pair.stream().filter(r -> r.job() == job).count();
                parts.add(
                        wholeJob ? job.getCode() + "'s horses weren't isolated" : names(riders) + " weren't isolated");
            } else {
                parts.add(names(riders) + " " + e.getKey());
            }
        }
        String message = trip.getCode() + ": " + String.join("; ", parts) + ". Sharing a trailer ends that isolation.";
        return Optional.of(warning("ISOLATION", List.of(a, b), pair, message, String.join("|", byIsolation.keySet())));
    }

    private static Set<String> healthTests(TransportJob job, Map<UUID, List<ChecklistItem>> items) {
        return items.getOrDefault(job.getId(), List.of()).stream()
                .map(ChecklistItem::getDocumentType)
                .filter(dt -> dt != null && dt.getCategory() == DocumentCategory.HEALTH)
                .map(DocumentType::getName)
                .collect(Collectors.toCollection(TreeSet::new));
    }

    /** 2. The jobs' rules require different health documents, so one job's horses weren't tested for something. */
    private Optional<Warning> healthTests(TransportJob a, TransportJob b, Map<UUID, List<ChecklistItem>> items) {
        Set<String> ofA = healthTests(a, items);
        Set<String> ofB = healthTests(b, items);
        if (ofA.equals(ofB)) return Optional.empty();
        List<String> parts = new ArrayList<>();
        Set<String> onlyA = new TreeSet<>(ofA);
        onlyA.removeAll(ofB);
        Set<String> onlyB = new TreeSet<>(ofB);
        onlyB.removeAll(ofA);
        if (!onlyA.isEmpty())
            parts.add(a.getCode() + " needs " + String.join(", ", onlyA) + "; " + b.getCode()
                    + "'s rules don't, so its horses may not have been tested or certified for it");
        if (!onlyB.isEmpty())
            parts.add(b.getCode() + " needs " + String.join(", ", onlyB) + "; " + a.getCode()
                    + "'s rules don't, so its horses may not have been tested or certified for it");
        return Optional.of(
                warning("HEALTH_TESTS", List.of(a, b), List.of(), String.join(". ", parts) + ".", onlyA + "|" + onlyB));
    }

    /** 3. A health document of a horse on the trailer that isn't CLEARED and GREEN for the planned departure. */
    private Optional<Warning> healthDocuments(
            TransportJob job, List<Rider> group, Map<UUID, List<ChecklistItem>> items) {
        Set<UUID> horses = group.stream()
                .filter(r -> r.job() == job)
                .map(r -> r.horse().getId())
                .collect(Collectors.toSet());
        List<ChecklistItem> open = items.getOrDefault(job.getId(), List.of()).stream()
                .filter(ci ->
                        ci.getDocumentType() != null && ci.getDocumentType().getCategory() == DocumentCategory.HEALTH)
                .filter(ci ->
                        ci.getHorse() == null || horses.contains(ci.getHorse().getId()))
                .filter(ci -> ci.getStatus() != ChecklistStatus.CLEARED || ci.getValidity() != Validity.GREEN)
                .sorted(Comparator.comparing(
                                (ChecklistItem ci) -> ci.getDocumentType().getName())
                        .thenComparing(
                                ci -> ci.getHorse() == null ? "" : ci.getHorse().getName()))
                .toList();
        if (open.isEmpty()) return Optional.empty();
        String list = open.stream()
                .map(ci -> ci.getDocumentType().getName()
                        + (ci.getHorse() == null ? "" : " for " + ci.getHorse().getName())
                        + " (" + state(ci) + ")")
                .collect(Collectors.joining(", "));
        List<Rider> riders = group.stream().filter(r -> r.job() == job).toList();
        String detail = open.stream()
                .map(ci -> ci.getId() + ":" + ci.getStatus() + ":" + ci.getValidity())
                .collect(Collectors.joining(","));
        return Optional.of(warning(
                "HEALTH_DOCUMENTS",
                List.of(job),
                riders,
                job.getCode() + ": health documents not yet clear for departure: " + list + ".",
                detail));
    }

    private static String state(ChecklistItem ci) {
        if (ci.getStatus() == ChecklistStatus.CLEARED)
            return "cleared, "
                    + (ci.getValidity() == null
                            ? "not checked"
                            : ci.getValidity().name()) + " for departure";
        return ci.getStatus().name().toLowerCase(Locale.ROOT).replace('_', ' ');
    }

    private static String names(List<Rider> riders) {
        Map<TransportJob, List<String>> byJob = new LinkedHashMap<>();
        riders.forEach(r -> byJob.computeIfAbsent(r.job(), x -> new ArrayList<>())
                .add(r.horse().getName()));
        return byJob.entrySet().stream()
                .map(e -> join(e.getValue()) + " (" + e.getKey().getCode() + ")")
                .collect(Collectors.joining(" and "));
    }

    private static String join(List<String> names) {
        if (names.size() <= 1) return String.join("", names);
        return String.join(", ", names.subList(0, names.size() - 1)) + " and " + names.getLast();
    }

    private static Warning warning(
            String kind, List<TransportJob> jobs, List<Rider> riders, String message, String detail) {
        List<String> codes = jobs.stream().map(TransportJob::getCode).sorted().toList();
        List<String> horseIds =
                riders.stream().map(r -> r.horse().getId().toString()).sorted().toList();
        String key = hash(kind + "|" + codes + "|" + horseIds + "|" + detail);
        return new Warning(
                key, kind, codes, riders.stream().map(r -> r.horse().getName()).toList(), message);
    }

    private static String hash(String content) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 32);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private List<BiosecurityWarningResponse> withAccepted(Trip trip, List<Warning> warnings) {
        Set<String> accepted = acceptedKeys(trip);
        return warnings.stream()
                .map(w -> BiosecurityWarningResponse.builder()
                        .key(w.key())
                        .kind(w.kind())
                        .jobCodes(w.jobCodes())
                        .horses(w.horses())
                        .message(w.message())
                        .accepted(accepted.contains(w.key()))
                        .build())
                .toList();
    }

    private Set<String> acceptedKeys(Trip trip) {
        return acceptances.findByTrip_Id(trip.getId()).stream()
                .map(TripWarningAcceptance::getWarningKey)
                .collect(Collectors.toSet());
    }

    /**
     * Records the warnings the coordinator accepted now, with who accepted them in the audit log, then refuses (409,
     * BIOSECURITY_WARNINGS) while any current warning is neither accepted before nor now. A warning that changed has
     * a new key, so it is asked again.
     */
    @Transactional
    public void requireAccepted(
            Trip trip, List<BiosecurityWarningResponse> warnings, Collection<String> acceptedNow, User user) {
        Set<String> accepted = new HashSet<>(acceptedKeys(trip));
        Set<String> now = acceptedNow == null ? Set.of() : new HashSet<>(acceptedNow);
        for (BiosecurityWarningResponse w : warnings) {
            if (accepted.contains(w.key()) || !now.contains(w.key())) continue;
            TripWarningAcceptance acceptance = new TripWarningAcceptance();
            acceptance.setTrip(trip);
            acceptance.setWarningKey(w.key());
            acceptance.setSummary(AuditText.fit(w.message()));
            acceptance.setAcceptedBy(user);
            acceptance.setAcceptedAt(clock.instant());
            acceptances.save(acceptance);
            audit.recordDecision(
                    user,
                    "ACCEPT_BIOSECURITY_WARNING",
                    AuditText.fit("Accepted on trip " + trip.getCode() + ": " + w.message()),
                    "TRIP",
                    trip.getId(),
                    trip.getCode(),
                    null,
                    null,
                    w.kind());
            accepted.add(w.key());
        }
        List<String> open = warnings.stream()
                .filter(w -> !accepted.contains(w.key()))
                .map(BiosecurityWarningResponse::message)
                .toList();
        if (!open.isEmpty()) {
            throw new ConflictException(
                    "BIOSECURITY_WARNINGS",
                    "Read and accept the biosecurity warnings to go on (" + open.size()
                            + (open.size() == 1 ? " warning" : " warnings") + ").",
                    open);
        }
    }
}
