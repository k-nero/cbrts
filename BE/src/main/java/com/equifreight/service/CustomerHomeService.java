package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.Club;
import com.equifreight.entity.DocumentVersion;
import com.equifreight.entity.Horse;
import com.equifreight.entity.Place;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.ChecklistHolder;
import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.model.home.CustomerHomeResponse;
import com.equifreight.model.home.HomeHorseResponse;
import com.equifreight.model.home.HomeMapper;
import com.equifreight.model.home.MoveEntryResponse;
import com.equifreight.model.home.NextDepartureResponse;
import com.equifreight.model.home.NextEventResponse;
import com.equifreight.model.home.OwedEntryResponse;
import com.equifreight.model.home.TonedTextResponse;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TransportRequestRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The customer's Home (DESIGN.md, Home signed in): what the club owes across every request, soonest first, each
 * request still in progress as a move, and its horses with their documents for the next move. Built from a fixed
 * number of queries, however many requests the club has.
 */
@Service
public class CustomerHomeService {

    /** Requests that ended before becoming a move: they never appear on Home. */
    private static final Set<RequestStatus> ENDED = EnumSet.of(RequestStatus.REJECTED, RequestStatus.CANCELLED);

    /** An owed item due within this many days is "soon". */
    private static final int SOON_DAYS = 7;

    /** A document due on a day is due by the end of that business day. */
    private static final LocalTime DUE_BY = LocalTime.of(17, 0);

    private final ClubService clubs;
    private final TransportRequestRepository requests;
    private final QuotationRepository quotations;
    private final TransportJobRepository jobs;
    private final ChecklistItemRepository checklist;
    private final HorseRepository horses;
    private final Clock clock;

    public CustomerHomeService(
            ClubService clubs,
            TransportRequestRepository requests,
            QuotationRepository quotations,
            TransportJobRepository jobs,
            ChecklistItemRepository checklist,
            HorseRepository horses,
            Clock clock) {
        this.clubs = clubs;
        this.requests = requests;
        this.quotations = quotations;
        this.jobs = jobs;
        this.checklist = checklist;
        this.horses = horses;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CustomerHomeResponse get(User user) {
        Club club = clubs.requireClub(user);
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, BusinessTime.ZONE);

        List<TransportRequest> all = requests.findByClubIdAndStatusNotIn(club.getId(), ENDED);
        List<UUID> ids = all.stream().map(TransportRequest::getId).toList();
        Map<UUID, Long> horseCounts = new HashMap<>();
        Map<UUID, Quotation> latestIssued = new HashMap<>();
        Map<UUID, TransportJob> jobOf = new HashMap<>();
        if (!ids.isEmpty()) {
            requests.countHorses(ids).forEach(c -> horseCounts.put(c.getRequestId(), c.getHorses()));
            quotations
                    .findByRequestIdInAndStatusNot(ids, QuotationStatus.DRAFT)
                    .forEach(q -> latestIssued.merge(
                            q.getRequest().getId(), q, (a, b) -> a.getVersionNo() >= b.getVersionNo() ? a : b));
            jobs.findByRequestIdIn(ids).forEach(j -> jobOf.put(j.getRequest().getId(), j));
        }
        List<TransportRequest> live = all.stream()
                .filter(r -> inProgress(r, latestIssued.get(r.getId()), jobOf.get(r.getId())))
                .toList();

        // One query for every document of the club's jobs that haven't left: the owed ones and each horse's count.
        List<ChecklistItem> items = checklist.findOnUndepartedJobsOfClub(club.getId());
        List<ChecklistItem> owedItems =
                items.stream().filter(CustomerHomeService::owedByCustomer).toList();
        Map<UUID, List<ChecklistItem>> owedByJob = owedItems.stream()
                .collect(Collectors.groupingBy(ci -> ci.getJob().getId()));

        List<OwedEntryResponse> owed = new ArrayList<>();
        owedItems.forEach(ci -> owed.add(documentOwed(ci, today)));
        for (TransportRequest r : live) {
            Quotation q = latestIssued.get(r.getId());
            if (r.getStatus() == RequestStatus.QUOTED && q != null && q.getStatus() == QuotationStatus.ISSUED) {
                owed.add(quotationOwed(r, q, today));
            } else if (r.getStatus() == RequestStatus.INFO_REQUIRED) {
                owed.add(HomeMapper.toAnswerOwed(
                        r,
                        "soon",
                        r.getCode() + " · " + route(r),
                        r.getInfoRequiredNote() == null
                                ? "The logistics manager needs more information before pricing your move."
                                : r.getInfoRequiredNote()));
            }
        }
        owed.sort(Comparator.comparing(OwedEntryResponse::dueAt, Comparator.nullsLast(Comparator.naturalOrder())));
        int owedRequestCount =
                (int) owed.stream().map(OwedEntryResponse::requestId).distinct().count();

        List<MoveEntryResponse> moves = live.stream()
                .map(r -> move(
                        r,
                        horseCounts.getOrDefault(r.getId(), 0L),
                        latestIssued.get(r.getId()),
                        jobOf.get(r.getId()),
                        owedByJob,
                        today))
                .sorted(Comparator.comparingInt((MoveEntryResponse m) -> needsYou(m.holds()))
                        .thenComparing(MoveEntryResponse::departsAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        Optional<TransportJob> next = nextJob(live, jobOf);
        List<Horse> herd = horses.findByClubIdAndArchivedAtIsNullOrderByName(club.getId());

        return CustomerHomeResponse.builder()
                .asOf(now)
                .clubName(club.getName())
                .requestCount(moves.size())
                .horseCount(herd.size())
                .nextDeparture(next.map(CustomerHomeService::nextDeparture).orElse(null))
                .owed(owed)
                .owedRequestCount(owedRequestCount)
                .nextEvent(owed.isEmpty() && !moves.isEmpty() ? nextEvent(next.orElse(null), moves) : null)
                .moves(moves)
                .horses(horses(herd, next.orElse(null), items, owedItems, today))
                .horsesNote(horsesNote(next.orElse(null)))
                .build();
    }

    /* ---------- what is in progress ---------- */

    /**
     * Still a move: not a request the club declined (it ends EXPIRED), and not a job that has closed. An expired
     * quotation the club didn't decline is being re-priced, so it stays.
     */
    static boolean inProgress(TransportRequest r, Quotation latest, TransportJob job) {
        if (r.getStatus() == RequestStatus.EXPIRED
                && (latest == null || latest.getStatus() == QuotationStatus.DECLINED)) return false;
        return job == null || (job.getClosedAt() == null && job.getStage() != JobStage.CLOSED);
    }

    /** The customer owes the next step: an upload, a replacement, or a new document (as the checklist page says). */
    static boolean owedByCustomer(ChecklistItem ci) {
        return ci.getStatus() != ChecklistStatus.CLEARED && ci.getHolder() == ChecklistHolder.CUSTOMER;
    }

    /** The job on the road, else the soonest planned departure among jobs that haven't left. */
    private static Optional<TransportJob> nextJob(List<TransportRequest> live, Map<UUID, TransportJob> jobOf) {
        List<TransportJob> open = live.stream()
                .map(r -> jobOf.get(r.getId()))
                .filter(Objects::nonNull)
                .toList();
        Optional<TransportJob> onRoad =
                open.stream().filter(CustomerHomeService::onRoad).findFirst();
        if (onRoad.isPresent()) return onRoad;
        return open.stream()
                .filter(j -> j.getDepartedAt() == null && j.getPlannedDepartureAt() != null)
                .min(Comparator.comparing(TransportJob::getPlannedDepartureAt));
    }

    private static boolean onRoad(TransportJob j) {
        return j.getTripStatus() == TripStatus.DEPARTED || j.getTripStatus() == TripStatus.HELD;
    }

    /* ---------- owed ---------- */

    private OwedEntryResponse documentOwed(ChecklistItem ci, LocalDate today) {
        String doc = ci.getDocumentType().getName();
        DocumentVersion v = ci.getCurrentVersion();
        boolean rejected = ci.getStatus() == ChecklistStatus.REJECTED;
        String title = rejected
                ? "Replace the rejected " + lowerFirst(doc)
                : v != null ? "Upload a new " + lowerFirst(doc) : "Upload the " + lowerFirst(doc);
        String reason;
        if (rejected && v != null && v.getRejectReason() != null) {
            reason = "Rejected"
                    + (v.getReviewedAt() == null ? "" : " " + shortDay(v.getReviewedAt()))
                    + " by the transport specialist: " + v.getRejectReason();
        } else if (ci.getValidityNote() != null) {
            reason = ci.getValidityNote();
        } else {
            reason = "Needed before " + ci.getJob().getCode() + " can clear for departure.";
        }
        String subject = ci.getJob().getCode() + " · "
                + (ci.getHorse() == null ? "Shipment" : ci.getHorse().getName()) + " · " + doc;
        Instant dueAt = ci.getDueDate() == null
                ? null
                : ci.getDueDate().atTime(DUE_BY).atZone(BusinessTime.ZONE).toInstant();
        return HomeMapper.toDocumentOwed(ci, urgency(ci.getDueDate(), today), title, subject, reason, dueAt);
    }

    private OwedEntryResponse quotationOwed(TransportRequest r, Quotation q, LocalDate today) {
        LocalDate until = q.getValidUntil() == null ? null : LocalDate.ofInstant(q.getValidUntil(), BusinessTime.ZONE);
        String price = q.getTotal() == null
                ? ""
                : " · " + q.getCurrency() + " " + String.format(Locale.ENGLISH, "%,.2f", q.getTotal());
        String reason = until == null
                ? "Accept it to book the move, or decline it."
                : "It holds its price until " + until.format(BusinessTime.SHORT_DAY)
                        + "; after that it is re-priced from the rate catalog in force.";
        return HomeMapper.toQuotationOwed(
                q,
                urgency(until, today),
                "Accept or decline quotation " + q.getCode() + " v" + q.getVersionNo(),
                r.getCode() + " · " + q.getCode() + price,
                reason);
    }

    /** Overdue past the date, soon within a week, else upcoming; an undated item is upcoming. */
    static String urgency(LocalDate due, LocalDate today) {
        if (due == null) return "upcoming";
        long days = ChronoUnit.DAYS.between(today, due);
        if (days < 0) return "overdue";
        return days <= SOON_DAYS ? "soon" : "upcoming";
    }

    /* ---------- moves ---------- */

    private static MoveEntryResponse move(
            TransportRequest r,
            long horseCount,
            Quotation q,
            TransportJob job,
            Map<UUID, List<ChecklistItem>> owedByJob,
            LocalDate today) {
        List<String> parts = new ArrayList<>();
        if (job != null) parts.add("job " + job.getCode());
        else if (q != null) parts.add("quotation " + q.getCode());
        parts.add(horseCount + (horseCount == 1 ? " horse" : " horses"));
        String service = service(r);
        if (service != null) parts.add(service);

        Instant departsAt = job != null && job.getPlannedDepartureAt() != null
                ? job.getPlannedDepartureAt()
                : r.getDepartureDate() == null
                        ? null
                        : r.getDepartureDate().atStartOfDay(BusinessTime.ZONE).toInstant();
        Instant arrivesAt = job != null && onRoad(job) ? job.getPlannedArrivalAt() : null;
        List<ChecklistItem> owed = job == null ? List.of() : owedByJob.getOrDefault(job.getId(), List.of());
        return HomeMapper.toMove(
                r,
                route(r),
                String.join(" · ", parts),
                stage(r, job),
                holds(r, job, owed, today),
                departsAt,
                arrivesAt);
    }

    /** The stage a move is at (DESIGN.md, Process Vocabulary): the job's once there is one, else the request's. */
    static String stage(TransportRequest r, TransportJob job) {
        if (job != null) {
            return switch (job.getStage()) {
                case DOCUMENTS -> "Documents";
                case CLEARANCE -> "Clearance";
                case TRIP -> "Trip";
                case HANDOVER, CLOSED -> "Handover";
            };
        }
        return switch (r.getStatus()) {
            case QUOTED, EXPIRED -> "Quotation";
            case CUSTOMER_ACCEPTED, APPROVED -> "Approval";
            default -> "Request";
        };
    }

    /** What holds the move, in words and a tone: Bad or Warn when it waits on the club, Neutral when it doesn't. */
    static TonedTextResponse holds(TransportRequest r, TransportJob job, List<ChecklistItem> owed, LocalDate today) {
        if (job != null) {
            if (job.getTripStatus() == TripStatus.HELD) return new TonedTextResponse("On the road · held", "warn");
            if (job.getTripStatus() == TripStatus.DEPARTED) return new TonedTextResponse("On the road", "info");
            if (job.getTripStatus() == TripStatus.ARRIVED || job.getTripStatus() == TripStatus.DELIVERED)
                return new TonedTextResponse("Delivered · handover in progress", "ok");
            if (job.getDossierStatus() == DossierStatus.CLEARANCE_READY)
                return new TonedTextResponse("Cleared to depart", "ok");
            if (!owed.isEmpty()) {
                boolean overdue = owed.stream().anyMatch(ci -> "overdue".equals(urgency(ci.getDueDate(), today)));
                return new TonedTextResponse("Departure locked · you owe " + owed.size(), overdue ? "bad" : "warn");
            }
            return new TonedTextResponse("Documents in review · nothing needed", "neutral");
        }
        return switch (r.getStatus()) {
            case DRAFT -> new TonedTextResponse("Draft · finish and submit it", "warn");
            case INFO_REQUIRED -> new TonedTextResponse("Needs your answer", "warn");
            case QUOTED -> new TonedTextResponse("Quotation waiting for you", "warn");
            case CUSTOMER_ACCEPTED -> new TonedTextResponse("With the logistics manager for approval", "neutral");
            case EXPIRED -> new TonedTextResponse("Quotation expired · being re-priced", "neutral");
            default -> new TonedTextResponse("In review · nothing needed", "neutral");
        };
    }

    /** Bad first, then Warn, then the rest. */
    private static int needsYou(TonedTextResponse holds) {
        return switch (holds.tone()) {
            case "bad" -> 0;
            case "warn" -> 1;
            default -> 2;
        };
    }

    /** "Ho Chi Minh City → Phnom Penh"; a draft may not have both ends yet. */
    static String route(TransportRequest r) {
        String from = end(r.getOriginPlace(), r.getOriginText());
        String to = end(r.getDestinationPlace(), r.getDestinationText());
        if (from == null && to == null) return "Route not chosen yet";
        return (from == null ? "…" : from) + " → " + (to == null ? "…" : to);
    }

    private static String end(Place place, String text) {
        if (place != null) return place.getCity() != null ? place.getCity() : place.getName();
        return text;
    }

    /** "road, private trailer" or "air, business class". */
    private static String service(TransportRequest r) {
        if (r.getMode() == null) return null;
        if (r.getMode() == TransportMode.ROAD) {
            if (r.getTrailer() == null) return "road";
            return "road, "
                    + (switch (r.getTrailer()) {
                        case PRIVATE -> "private trailer";
                        case SHARED -> "shared load";
                    });
        }
        return r.getAirClass() == null
                ? "air"
                : "air, " + r.getAirClass().name().toLowerCase(Locale.ROOT) + " class";
    }

    /* ---------- next departure and event ---------- */

    private static NextDepartureResponse nextDeparture(TransportJob job) {
        String state = onRoad(job)
                ? "on-road"
                : job.getDossierStatus() == DossierStatus.CLEARANCE_READY ? "cleared" : "locked";
        return NextDepartureResponse.builder()
                .route(route(job.getRequest()))
                .departsAt(job.getDepartedAt() != null ? job.getDepartedAt() : job.getPlannedDepartureAt())
                .state(state)
                .arrivesAt(job.getPlannedArrivalAt())
                .build();
    }

    /** What happens next when nothing is owed: the trip on the road, the next departure, or the soonest move. */
    private static NextEventResponse nextEvent(TransportJob next, List<MoveEntryResponse> moves) {
        String title = "Nothing needed from you";
        if (next != null && onRoad(next)) {
            return new NextEventResponse(
                    title,
                    "Your horses are on the road for " + next.getCode() + ", " + route(next.getRequest()) + ".",
                    "Expected",
                    next.getPlannedArrivalAt(),
                    "dayTime");
        }
        if (next != null) {
            String body = next.getDossierStatus() == DossierStatus.CLEARANCE_READY
                    ? "Every document for " + next.getCode() + " is cleared."
                    : "Your documents for " + next.getCode() + " are with the transport specialist.";
            return new NextEventResponse(title, body, "Departs", next.getPlannedDepartureAt(), "dayTime");
        }
        Instant soonest = moves.stream()
                .map(MoveEntryResponse::departsAt)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
        return new NextEventResponse(
                title,
                "Your requests are with our team. We tell you here as soon as one needs you.",
                "Departs",
                soonest,
                "date");
    }

    /* ---------- horses ---------- */

    private static List<HomeHorseResponse> horses(
            List<Horse> herd, TransportJob next, List<ChecklistItem> items, List<ChecklistItem> owed, LocalDate today) {
        Map<UUID, List<ChecklistItem>> onNext = next == null
                ? Map.of()
                : items.stream()
                        .filter(ci -> ci.getJob().getId().equals(next.getId()) && ci.getHorse() != null)
                        .collect(Collectors.groupingBy(ci -> ci.getHorse().getId()));
        // The soonest owed document per horse, across every job that hasn't left (owed is soonest first).
        Map<UUID, ChecklistItem> firstOwed = owed.stream()
                .filter(ci -> ci.getHorse() != null)
                .collect(Collectors.toMap(ci -> ci.getHorse().getId(), Function.identity(), (a, b) -> a));
        return herd.stream()
                .map(h -> HomeMapper.toHorse(
                        h, horseLine(h), documents(next, onNext.get(h.getId())), note(firstOwed.get(h.getId()), today)))
                .toList();
    }

    private static String documents(TransportJob next, List<ChecklistItem> mine) {
        if (next == null) return "No move booked";
        if (mine == null || mine.isEmpty()) return "Not on " + next.getCode();
        long cleared = mine.stream()
                .filter(ci -> ci.getStatus() == ChecklistStatus.CLEARED)
                .count();
        return cleared + " of " + mine.size() + " cleared";
    }

    private static TonedTextResponse note(ChecklistItem owed, LocalDate today) {
        if (owed == null) return null;
        String doc = owed.getDocumentType().getName();
        if ("overdue".equals(urgency(owed.getDueDate(), today))) return new TonedTextResponse(doc + " overdue", "bad");
        if (owed.getStatus() == ChecklistStatus.REJECTED) return new TonedTextResponse(doc + " rejected", "bad");
        return owed.getDueDate() == null
                ? new TonedTextResponse(doc + " needed", "warn")
                : new TonedTextResponse(doc + " due " + owed.getDueDate().format(BusinessTime.SHORT_DAY), "warn");
    }

    /** "Grey · Andalusian gelding". */
    static String horseLine(Horse h) {
        String coat = h.getCoat() == null ? null : capitalize(h.getCoat().name());
        String sex = h.getSex() == null ? null : h.getSex().name().toLowerCase(Locale.ROOT);
        String kind = h.getBreed() == null || h.getBreed().isBlank()
                ? (sex == null ? null : capitalize(sex))
                : h.getBreed() + (sex == null ? "" : " " + sex);
        if (coat == null) return kind == null ? "" : kind;
        return kind == null ? coat : coat + " · " + kind;
    }

    private static String horsesNote(TransportJob next) {
        if (next == null) return "Documents are asked for per move, once a request is approved.";
        if (next.getPlannedDepartureAt() == null) return "Documents cleared for " + next.getCode() + ".";
        return "Documents cleared for the " + shortDay(next.getPlannedDepartureAt()) + " move, " + next.getCode() + ".";
    }

    /* ---------- words ---------- */

    private static String shortDay(Instant at) {
        return LocalDate.ofInstant(at, BusinessTime.ZONE).format(BusinessTime.SHORT_DAY);
    }

    private static String capitalize(String s) {
        String lower = s.toLowerCase(Locale.ROOT);
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    /** "Equine passport" → "equine passport", but "EIA (Coggins) test" stays as it is. */
    static String lowerFirst(String s) {
        if (s.length() < 2 || !Character.isLowerCase(s.charAt(1))) return s;
        return Character.toLowerCase(s.charAt(0)) + s.substring(1);
    }
}
