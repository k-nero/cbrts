package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Horse;
import com.equifreight.entity.Place;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.RequestRevision;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.request.Blocker;
import com.equifreight.model.request.LeadTimeResponse;
import com.equifreight.model.request.RequestDraftRequest;
import com.equifreight.model.request.RequestHorseInput;
import com.equifreight.model.request.RequestMapper;
import com.equifreight.model.request.RequestResponse;
import com.equifreight.model.request.RequestSummaryResponse;
import com.equifreight.model.route.RouteResponse;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RequestRevisionRepository;
import com.equifreight.repository.TransportRequestRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * A customer's transport requests (US-F1-01, US-F1-02). A draft is saved whole on every step and may be
 * incomplete; a save checks only its shape and the database's own rules (spec R-01 to R-05), and what still
 * stops it from being submitted comes back as blockers (§5.2). Every request is scoped to the caller's club.
 */
@Service
public class RequestService {

    /** Mirrors transport_requests_arrival_window_check until the rate catalog's ARRIVAL_WINDOW_MIN_HOURS exists. */
    static final Duration MIN_ARRIVAL_WINDOW = Duration.ofHours(3);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final String ENTITY_TYPE = "TRANSPORT_REQUEST";
    /** audit_log.summary is varchar(500). */
    private static final int AUDIT_SUMMARY_MAX = 500;

    private final TransportRequestRepository requests;
    private final HorseRepository horses;
    private final PlaceRepository places;
    private final RequestRevisionRepository revisions;
    private final RouteService routes;
    private final ClubService clubs;
    private final CodeService codes;
    private final AuditService audit;
    private final JsonMapper json;
    private final Clock clock;

    public RequestService(TransportRequestRepository requests, HorseRepository horses, PlaceRepository places,
                          RequestRevisionRepository revisions, RouteService routes, ClubService clubs,
                          CodeService codes, AuditService audit, JsonMapper json, Clock clock) {
        this.requests = requests;
        this.horses = horses;
        this.places = places;
        this.revisions = revisions;
        this.routes = routes;
        this.clubs = clubs;
        this.codes = codes;
        this.audit = audit;
        this.json = json;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Page<RequestSummaryResponse> list(User user, RequestStatus status, Pageable pageable) {
        Club club = clubs.requireClub(user);
        Page<TransportRequest> page = status == null
                ? requests.findByClubId(club.getId(), pageable)
                : requests.findByClubIdAndStatus(club.getId(), status, pageable);
        Map<UUID, Long> counts = new LinkedHashMap<>();
        if (!page.isEmpty()) {
            requests.countHorses(page.map(TransportRequest::getId).getContent())
                    .forEach(c -> counts.put(c.getRequestId(), c.getHorses()));
        }
        return page.map(r -> RequestMapper.toSummary(r, counts.getOrDefault(r.getId(), 0L)));
    }

    @Transactional(readOnly = true)
    public RequestResponse get(User user, UUID id) {
        Club club = clubs.requireClub(user);
        TransportRequest request = requests.findByIdAndClubId(id, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", id));
        return toResponse(request, request.getStatus() == RequestStatus.DRAFT ? resolve(request) : null);
    }

    @Transactional
    public RequestResponse create(User user, RequestDraftRequest body) {
        Club club = clubs.requireClub(user);
        Draft draft = validate(club, body, Set.of());
        TransportRequest request = new TransportRequest();
        request.setClub(club);
        request.setCreatedBy(user);
        request.setStatus(RequestStatus.DRAFT);
        RouteResolution resolution = write(request, draft);
        // Flushed, so the answer carries the created and updated times the insert or update writes.
        return toResponse(requests.saveAndFlush(request), resolution);
    }

    @Transactional
    public RequestResponse update(User user, UUID id, RequestDraftRequest body) {
        Club club = clubs.requireClub(user);
        TransportRequest request = findDraftForUpdate(club, id);
        Set<UUID> alreadyOn = request.getHorses().stream().map(rh -> rh.getHorse().getId())
                .collect(Collectors.toSet());
        Draft draft = validate(club, body, alreadyOn);
        RouteResolution resolution = write(request, draft);
        return toResponse(requests.saveAndFlush(request), resolution);
    }

    /**
     * R-07, in one transaction with the request row locked, so a double click can't issue two codes: re-run
     * the blockers, refresh the horse snapshots, issue the REQ code, set SUBMITTED, and keep revision 1 and the
     * audit trail (BR-F1-08).
     */
    @Transactional
    public RequestResponse submit(User user, UUID id) {
        Club club = clubs.requireClub(user);
        TransportRequest request = findDraftForUpdate(club, id);
        LocalDate today = LocalDate.now(clock);
        RouteResolution resolution = resolve(request);
        List<Blocker> blockers = SubmissionCheck.blockers(request, resolution, today);
        if (!blockers.isEmpty()) {
            throw new ConflictException("SUBMISSION_BLOCKED", "This request can't be submitted yet.",
                    blockers.stream().map(Blocker::getMessage).toList());
        }
        // No blocker means a resolved corridor with a known lead time (ROUTE_NOT_RUN, CATALOG_INCOMPLETE).
        LeadTimeResponse leadTime = LeadTimePolicy.assess(resolution.route().getLeadTimeDays(), today,
                request.getDepartureDate());

        request.getHorses().forEach(RequestService::snapshot);
        request.setCorridor(resolution.corridor());
        String code = codes.next(CodePrefix.REQ, today.getYear());
        Instant now = Instant.now(clock);
        request.setCode(code);
        request.setStatus(RequestStatus.SUBMITTED);
        request.setSubmittedAt(now);
        TransportRequest saved = requests.save(request);
        RequestResponse response = RequestMapper.toResponse(saved, resolution.route(), null, List.of());

        RequestRevision revision = new RequestRevision();
        revision.setRequest(saved);
        revision.setRevisionNo((short) 1);
        revision.setPayload(json.writeValueAsString(response));
        revision.setSubmittedAt(now);
        revisions.save(revision);

        audit.recordDecision(user, "REQUEST_SUBMITTED",
                submittedSummary(response.getHorses().stream().map(h -> h.getName()).toList()),
                ENTITY_TYPE, saved.getId(), code, null, "{\"status\":\"DRAFT\"}", "{\"status\":\"SUBMITTED\"}");
        audit.recordSystem("LEAD_TIME_CHECKED", "Lead time checked: " + leadTime.getDaysBeforeDeparture()
                        + " days before departure, " + leadTime.getRequiredDays() + " required.",
                ENTITY_TYPE, saved.getId(), code, null, null);
        return response;
    }

    /**
     * "Submitted with 2 horses: Nightfall, Shadowfax." A long string is cut to "… and 12 more." so the line
     * fits audit_log.summary.
     */
    static String submittedSummary(List<String> names) {
        String head = "Submitted with " + names.size() + (names.size() == 1 ? " horse: " : " horses: ");
        String all = head + String.join(", ", names) + ".";
        if (all.length() <= AUDIT_SUMMARY_MAX) {
            return all;
        }
        StringBuilder listed = new StringBuilder();
        int shown = 0;
        for (String name : names) {
            String next = (shown == 0 ? "" : ", ") + name;
            String tail = " and " + (names.size() - shown - 1) + " more.";
            if (head.length() + listed.length() + next.length() + tail.length() > AUDIT_SUMMARY_MAX) {
                break;
            }
            listed.append(next);
            shown++;
        }
        return head + listed + " and " + (names.size() - shown) + " more.";
    }

    /** A draft was never submitted, has no code and nothing refers to it, so it is removed. */
    @Transactional
    public void delete(User user, UUID id) {
        Club club = clubs.requireClub(user);
        requests.delete(findDraftForUpdate(club, id));
    }

    // --- loading ------------------------------------------------------------------------------------------

    private TransportRequest findForUpdate(Club club, UUID id) {
        return requests.findForUpdate(id, club.getId()).orElseThrow(() -> ResourceNotFoundException.of("Request", id));
    }

    private TransportRequest findDraftForUpdate(Club club, UUID id) {
        TransportRequest request = findForUpdate(club, id);
        requireDraft(request);
        return request;
    }

    private static void requireDraft(TransportRequest request) {
        if (request.getStatus() == RequestStatus.DRAFT) {
            return;
        }
        String message = request.getCode() == null || request.getSubmittedAt() == null
                ? "This request is no longer a draft and can't be edited here."
                : request.getCode() + " was submitted on "
                + BusinessTime.DAY.format(request.getSubmittedAt().atZone(BusinessTime.ZONE))
                + " and can't be edited here.";
        throw new ConflictException("REQUEST_NOT_DRAFT", message);
    }

    // --- validate, then write -----------------------------------------------------------------------------

    /** The body, checked and normalised; nothing is written until every check has passed. */
    private record Draft(List<Horse> horses, Map<UUID, Boolean> withFoal, Place origin, String originText,
                         Place destination, String destinationText, LocalDate departureDate, short dateFlexDays,
                         ArrivalMode arrivalMode, Instant windowStart, Instant windowEnd,
                         String specialInstructions, TransportMode mode, TrailerType trailer, ServiceClass airClass,
                         InsuranceOption insurance, boolean vetEscort) {}

    private Draft validate(Club club, RequestDraftRequest body, Set<UUID> alreadyOn) {
        List<RequestHorseInput> inputs = body.getHorses() == null ? List.of() : body.getHorses();
        Map<UUID, Horse> owned = horses.findByClubIdAndIdIn(club.getId(),
                        inputs.stream().map(RequestHorseInput::getHorseId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Horse::getId, Function.identity()));
        List<Horse> picked = new ArrayList<>();
        Map<UUID, Boolean> withFoal = new LinkedHashMap<>();
        Set<UUID> seen = new HashSet<>();
        for (RequestHorseInput input : inputs) {
            Horse horse = owned.get(input.getHorseId());
            if (horse == null) {
                throw ResourceNotFoundException.of("Horse", input.getHorseId());
            }
            if (!seen.add(horse.getId())) {
                throw new BusinessException("HORSE_LISTED_TWICE", horse.getName() + " is on the request twice.");
            }
            if (horse.getArchivedAt() != null && !alreadyOn.contains(horse.getId())) {
                throw new ConflictException("HORSE_ARCHIVED",
                        horse.getName() + " is archived and can't be added to a request.");
            }
            boolean foal = Boolean.TRUE.equals(input.getWithFoal());
            if (foal && horse.getSex() != HorseSex.MARE) {
                throw new BusinessException("FOAL_NOT_A_MARE", "Only a mare can travel with a foal at foot; "
                        + horse.getName() + " is a " + horse.getSex().name().toLowerCase(Locale.ROOT) + ".");
            }
            picked.add(horse);
            withFoal.put(horse.getId(), foal);
        }

        String originText = clean(body.getOriginText());
        String destinationText = clean(body.getDestinationText());
        if (body.getOriginPlaceId() != null && originText != null) {
            throw new BusinessException("PLACE_OR_TEXT", "Choose a place or type a city for the origin, not both.");
        }
        if (body.getDestinationPlaceId() != null && destinationText != null) {
            throw new BusinessException("PLACE_OR_TEXT",
                    "Choose a place or type a city for the destination, not both.");
        }
        Place origin = body.getOriginPlaceId() == null ? null : findEnd(body.getOriginPlaceId());
        Place destination = body.getDestinationPlaceId() == null ? null : findEnd(body.getDestinationPlaceId());
        if (origin != null && destination != null && origin.getId().equals(destination.getId())) {
            throw new BusinessException("SAME_PLACE", "The horses can't be collected and delivered at the same place.");
        }

        TransportMode mode = body.getMode();
        // Mirrors transport_requests_mode_options_check, which also refuses both without a mode.
        if ((mode == TransportMode.ROAD && body.getAirClass() != null)
                || (mode == TransportMode.AIR && body.getTrailer() != null)
                || (body.getTrailer() != null && body.getAirClass() != null)) {
            throw new BusinessException("MODE_OPTIONS", "Air moves have no trailer, and road moves have no air class.");
        }
        int flex = body.getDateFlexDays() == null ? 0 : body.getDateFlexDays();
        if (flex != 0 && flex != 3) {
            throw new BusinessException("DATE_FLEX", "Dates can move by 0 or 3 days; " + flex + " was given.");
        }
        ArrivalMode arrivalMode = body.getArrivalMode() == null ? ArrivalMode.ANY_TIME : body.getArrivalMode();
        requireValidWindow(arrivalMode, mode, body.getTrailer(), flex, body.getWindowStart(), body.getWindowEnd());

        return new Draft(picked, withFoal, origin, originText, destination, destinationText, body.getDepartureDate(),
                (short) flex, arrivalMode, toInstant(body.getWindowStart()), toInstant(body.getWindowEnd()),
                clean(body.getSpecialInstructions()), mode, body.getTrailer(), body.getAirClass(),
                body.getInsurance(), Boolean.TRUE.equals(body.getVetEscort()));
    }

    /** R-04, the arrival-window check of the database, with the reason in words. */
    private static void requireValidWindow(ArrivalMode arrivalMode, TransportMode mode, TrailerType trailer, int flex,
                                           OffsetDateTime start, OffsetDateTime end) {
        if (arrivalMode == ArrivalMode.ANY_TIME) {
            if (start != null || end != null) {
                throw new BusinessException("ARRIVAL_WINDOW", "Arrival any time on the day takes no window times.");
            }
            return;
        }
        if (mode != TransportMode.ROAD || trailer != TrailerType.PRIVATE || flex != 0) {
            throw new BusinessException("ARRIVAL_WINDOW", "An arrival window needs a road move with a private "
                    + "trailer and fixed dates. Choose road and a private trailer, and untick ±3 days, or arrive "
                    + "any time on the day.");
        }
        if (start == null || end == null) {
            throw new BusinessException("ARRIVAL_WINDOW", "An arrival window needs both a start and an end.");
        }
        if (!end.isAfter(start)) {
            throw new BusinessException("ARRIVAL_WINDOW", "The arrival window ends before it starts.");
        }
        if (Duration.between(start, end).compareTo(MIN_ARRIVAL_WINDOW) < 0) {
            throw new BusinessException("ARRIVAL_WINDOW", "An arrival window is at least 3 hours; "
                    + TIME.format(start.atZoneSameInstant(BusinessTime.ZONE)) + "–"
                    + TIME.format(end.atZoneSameInstant(BusinessTime.ZONE)) + " is shorter.");
        }
    }

    private RouteResolution write(TransportRequest request, Draft draft) {
        Set<UUID> keep = draft.horses().stream().map(Horse::getId).collect(Collectors.toSet());
        request.getHorses().removeIf(rh -> !keep.contains(rh.getHorse().getId()));
        Map<UUID, RequestHorse> onRequest = request.getHorses().stream()
                .collect(Collectors.toMap(rh -> rh.getHorse().getId(), Function.identity()));
        for (Horse horse : draft.horses()) {
            RequestHorse rh = onRequest.get(horse.getId());
            if (rh == null) {
                rh = new RequestHorse();
                rh.setRequest(request);
                rh.setHorse(horse);
                request.getHorses().add(rh);
            }
            rh.setWithFoal(draft.withFoal().get(horse.getId()));
            snapshot(rh);
        }
        request.setOriginPlace(draft.origin());
        request.setOriginText(draft.originText());
        request.setDestinationPlace(draft.destination());
        request.setDestinationText(draft.destinationText());
        request.setDepartureDate(draft.departureDate());
        request.setDateFlexDays(draft.dateFlexDays());
        request.setArrivalMode(draft.arrivalMode());
        request.setWindowStart(draft.windowStart());
        request.setWindowEnd(draft.windowEnd());
        request.setSpecialInstructions(draft.specialInstructions());
        request.setMode(draft.mode());
        request.setTrailer(draft.trailer());
        request.setAirClass(draft.airClass());
        request.setInsurance(draft.insurance());
        request.setVetEscort(draft.vetEscort());
        RouteResolution resolution = resolve(request);
        request.setCorridor(resolution.corridor());
        return resolution;
    }

    /** The fields that price the horse, copied so a later edit of the horse doesn't change the request. */
    static void snapshot(RequestHorse rh) {
        Horse horse = rh.getHorse();
        rh.setDeclaredValue(horse.getDeclaredValue());
        rh.setSex(horse.getSex());
        rh.setSizeClassCode(horse.getSizeClass().getCode());
        rh.setRequiredStall(horse.getRequiredStall());
    }

    // --- reading ------------------------------------------------------------------------------------------

    private RouteResolution resolve(TransportRequest request) {
        return routes.resolve(request.getOriginPlace(), request.getOriginText(), request.getDestinationPlace(),
                request.getDestinationText(), request.getMode());
    }

    /** A draft carries its route, lead time and blockers; a submitted request only its stored route. */
    private RequestResponse toResponse(TransportRequest request, RouteResolution resolution) {
        if (request.getStatus() != RequestStatus.DRAFT) {
            RouteResponse route = request.getCorridor() == null || request.getOriginPlace() == null ? null
                    : routes.describe(request.getCorridor(), request.getOriginPlace(), request.getDestinationPlace());
            return RequestMapper.toResponse(request, route, null, List.of());
        }
        LocalDate today = LocalDate.now(clock);
        RouteResponse route = resolution.route();
        LeadTimeResponse leadTime = route == null || route.getLeadTimeDays() == null
                || request.getDepartureDate() == null ? null
                : LeadTimePolicy.assess(route.getLeadTimeDays(), today, request.getDepartureDate());
        List<Blocker> blockers = SubmissionCheck.blockers(request, resolution, today);
        return RequestMapper.toResponse(request, route, leadTime, blockers);
    }

    /** A pickup or delivery point; a welfare stop is a stop on the way, not an end of the trip. */
    private Place findEnd(UUID id) {
        Place place = places.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Place", id));
        if (place.getKind() == PlaceKind.WELFARE_STOP) {
            throw new BusinessException("PLACE_NOT_AN_END",
                    place.getName() + " is a stop on the way, not a pickup or delivery point.");
        }
        return place;
    }

    private static String clean(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static Instant toInstant(OffsetDateTime time) {
        return time == null ? null : time.toInstant();
    }

}
