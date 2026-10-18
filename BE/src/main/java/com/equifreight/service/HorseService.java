package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Horse;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.StallType;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.horse.HorseMapper;
import com.equifreight.model.horse.HorseRequest;
import com.equifreight.model.horse.HorseResponse;
import com.equifreight.model.horse.SizeClassResponse;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.HorseSizeClassRepository;
import com.equifreight.repository.RequestHorseRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * The customer's horse registry (US-F1-00, #12). Every horse belongs to the signed-in customer's club;
 * rules H-01 to H-08 of the Horses slice spec are checked here before anything is saved.
 */
@Service
public class HorseService {

    /**
     * A horse on a request in one of these statuses can't be archived (an unclosed job is checked too).
     */
    static final Set<RequestStatus> ARCHIVE_BLOCKING_STATUSES = Collections.unmodifiableSet(EnumSet.of(
            RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW, RequestStatus.INFO_REQUIRED,
            RequestStatus.QUOTED, RequestStatus.CUSTOMER_ACCEPTED));

    private static final String DEFAULT_CURRENCY = "USD";

    private final HorseRepository horses;
    private final HorseSizeClassRepository sizeClasses;
    private final RequestHorseRepository requestHorses;
    private final ClubService clubs;

    public HorseService(HorseRepository horses, HorseSizeClassRepository sizeClasses,
                        RequestHorseRepository requestHorses, ClubService clubs) {
        this.horses = horses;
        this.sizeClasses = sizeClasses;
        this.requestHorses = requestHorses;
        this.clubs = clubs;
    }

    /**
     * Removes every kind of space, including the non-breaking ones a copy from a PDF carries.
     */
    static String stripSpaces(String raw) {
        return raw == null ? null : raw.replaceAll("[\\s\\p{Z}]", "");
    }

    /**
     * ASCII digits only: full-width or other scripts' digits would slip past the unique microchip.
     */
    static String normalizeMicrochip(String raw) {
        String microchip = raw == null ? "" : stripSpaces(raw);
        if (!microchip.matches("[0-9]*")) {
            throw new BusinessException("INVALID_MICROCHIP",
                    "A microchip is 15 digits; " + microchip + " has letters or symbols.");
        }
        if (microchip.length() != 15) {
            throw new BusinessException("INVALID_MICROCHIP",
                    "A microchip is 15 digits; " + microchip + " has " + microchip.length() + ".");
        }
        return microchip;
    }

    static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /**
     * Compares the request's identity with the stored one, normalised as it would be saved.
     */
    private static void requireIdentityUnchanged(Horse horse, HorseRequest request, String requestCode) {
        List<String> changed = new ArrayList<>();
        if (!Objects.equals(horse.getName(), trimToNull(request.getName()))) {
            changed.add("Name");
        }
        if (!Objects.equals(horse.getMicrochip(), stripSpaces(request.getMicrochip()))) {
            changed.add("Microchip");
        }
        if (horse.getSex() != request.getSex()) {
            changed.add("Sex");
        }
        if (!Objects.equals(horse.getBreed(), trimToNull(request.getBreed()))) {
            changed.add("Breed");
        }
        if (!Objects.equals(horse.getDateOfBirth(), request.getDateOfBirth())) {
            changed.add("Date of birth");
        }
        if (horse.getCoat() != request.getCoat()) {
            changed.add("Coat");
        }
        if (changed.isEmpty()) {
            return;
        }
        throw new ConflictException("HORSE_IDENTITY_LOCKED", joinFields(changed) + " can't be changed: "
                + horse.getName() + " travelled on " + requestCode + ". Ask the transport specialist to correct "
                + (changed.size() == 1 ? "it" : "them") + " against " + possessivePronoun(horse.getSex())
                + " passport.");
    }

    /**
     * "Name", "Name and sex", "Name, sex and coat".
     */
    private static String joinFields(List<String> labels) {
        List<String> words = new ArrayList<>();
        for (int i = 0; i < labels.size(); i++) {
            words.add(i == 0 ? labels.get(i) : labels.get(i).toLowerCase(Locale.ROOT));
        }
        if (words.size() == 1) {
            return words.getFirst();
        }
        return String.join(", ", words.subList(0, words.size() - 1)) + " and " + words.getLast();
    }

    private static String whereItStands(RequestStatus status) {
        return switch (status) {
            case SUBMITTED, UNDER_REVIEW -> "is in review";
            case INFO_REQUIRED -> "is waiting for information from you";
            case QUOTED -> "has a quotation waiting for you";
            case CUSTOMER_ACCEPTED -> "is waiting for approval";
            case APPROVED -> "is an approved job that hasn't closed";
            default -> "is still open";
        };
    }

    private static boolean isFemale(HorseSex sex) {
        return sex == HorseSex.MARE || sex == HorseSex.FILLY;
    }

    private static String objectPronoun(HorseSex sex) {
        return isFemale(sex) ? "her" : "him";
    }

    private static String possessivePronoun(HorseSex sex) {
        return isFemale(sex) ? "her" : "his";
    }

    private static void requireDateOfBirthNotAfterToday(LocalDate dateOfBirth) {
        if (dateOfBirth != null && dateOfBirth.isAfter(LocalDate.now(BusinessTime.ZONE))) {
            throw new BusinessException("INVALID_DATE_OF_BIRTH",
                    "The date of birth " + BusinessTime.DAY.format(dateOfBirth) + " is after today.");
        }
    }

    /**
     * q matches name, passport number or microchip; archived lists archived horses instead of active ones.
     */
    @Transactional(readOnly = true)
    public Page<HorseResponse> list(User user, String q, boolean archived, Pageable pageable) {
        UUID clubId = clubs.requireClub(user).getId();
        Specification<Horse> spec = (root, cq, cb) -> {
            var predicates = new ArrayList<Predicate>();
            predicates.add(cb.equal(root.get("club").get("id"), clubId));
            predicates.add(archived ? cb.isNotNull(root.get("archivedAt")) : cb.isNull(root.get("archivedAt")));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                var matches = new ArrayList<Predicate>();
                matches.add(cb.like(cb.lower(root.get("name")), like));
                matches.add(cb.like(cb.lower(root.get("passportNo")), like));
                String digits = stripSpaces(q);
                if (!digits.isEmpty()) {
                    matches.add(cb.like(root.get("microchip"), "%" + digits + "%"));
                }
                predicates.add(cb.or(matches.toArray(new Predicate[0])));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<Horse> page = horses.findAll(spec, pageable);
        List<UUID> ids = page.getContent().stream().map(Horse::getId).toList();
        Set<UUID> locked = ids.isEmpty() ? Set.of() : requestHorses.findHorseIdsOnSubmittedRequests(ids);
        return page.map(horse -> HorseMapper.toResponse(horse, locked.contains(horse.getId())));
    }

    @Transactional(readOnly = true)
    public HorseResponse get(User user, UUID id) {
        Horse horse = findOwned(user, id);
        return HorseMapper.toResponse(horse, isIdentityLocked(horse));
    }

    @Transactional
    public HorseResponse create(User user, HorseRequest request) {
        Club club = clubs.requireClub(user);
        Horse horse = new Horse();
        horse.setClub(club);
        horse.setValueCurrency(DEFAULT_CURRENCY);
        applyChecked(club, horse, request);
        return HorseMapper.toResponse(saveChecked(horse), false);
    }

    /**
     * Full update. Identity fields are refused once the horse was on a submitted request (H-07).
     */
    @Transactional
    public HorseResponse update(User user, UUID id, HorseRequest request) {
        Club club = clubs.requireClub(user);
        Horse horse = findOwned(club, id);
        if (horse.getArchivedAt() != null) {
            throw new ConflictException("HORSE_ARCHIVED",
                    horse.getName() + " is archived. Archived horses can't be edited.");
        }
        List<String> submittedOn = requestHorses.findSubmittedRequestCodes(horse.getId());
        if (!submittedOn.isEmpty()) {
            requireIdentityUnchanged(horse, request, submittedOn.getFirst());
        }
        applyChecked(club, horse, request);
        return HorseMapper.toResponse(saveChecked(horse), !submittedOn.isEmpty());
    }

    /**
     * Archived, never deleted: past requests and jobs refer to the horse (H-08).
     */
    @Transactional
    public HorseResponse archive(User user, UUID id) {
        Horse horse = findOwned(user, id);
        if (horse.getArchivedAt() != null) {
            return HorseMapper.toResponse(horse, isIdentityLocked(horse));
        }
        List<RequestHorseRepository.HorseUse> uses =
                requestHorses.findActiveUses(horse.getId(), ARCHIVE_BLOCKING_STATUSES);
        if (!uses.isEmpty()) {
            RequestHorseRepository.HorseUse use = uses.getFirst();
            throw new ConflictException("HORSE_IN_USE", horse.getName() + " is on " + use.getCode() + ", which "
                    + whereItStands(use.getStatus()) + ". Archive " + objectPronoun(horse.getSex())
                    + " after it ends.");
        }
        horse.setArchivedAt(Instant.now());
        return HorseMapper.toResponse(saveChecked(horse), isIdentityLocked(horse));
    }

    @Transactional(readOnly = true)
    public List<SizeClassResponse> sizeClasses() {
        return sizeClasses.findAllByOrderByMinHeightHhAsc().stream().map(HorseMapper::toResponse).toList();
    }

    /**
     * The club's horse, archived or not; anyone else's, or an unknown id, is not found.
     */
    Horse findOwned(User user, UUID id) {
        return findOwned(clubs.requireClub(user), id);
    }

    private Horse findOwned(Club club, UUID id) {
        return horses.findByIdAndClubId(id, club.getId()).orElseThrow(() -> ResourceNotFoundException.of("Horse", id));
    }

    boolean isIdentityLocked(Horse horse) {
        return requestHorses.findHorseIdsOnSubmittedRequests(List.of(horse.getId())).contains(horse.getId());
    }

    /**
     * Validates every rule against the request, then copies it onto the horse. Nothing is saved here.
     */
    void applyChecked(Club club, Horse horse, HorseRequest request) {
        BigDecimal height = HorseSizing.requireValidHeight(request.getHeightHh());
        String microchip = normalizeMicrochip(request.getMicrochip());
        requireDateOfBirthNotAfterToday(request.getDateOfBirth());
        String name = request.getName().trim();
        requireNameFree(club, horse, name);
        requireMicrochipFree(horse, microchip);
        StallType stall = request.getRequiredStall() == null ? StallType.STANDARD : request.getRequiredStall();

        horse.setName(name);
        horse.setSex(request.getSex());
        horse.setCoat(request.getCoat());
        horse.setBreed(trimToNull(request.getBreed()));
        horse.setDateOfBirth(request.getDateOfBirth());
        horse.setHeightHh(height);
        horse.setWeightKg(request.getWeightKg());
        horse.setMicrochip(microchip);
        horse.setPassportNo(request.getPassportNo().trim());
        horse.setDeclaredValue(request.getDeclaredValue());
        horse.setTemperament(request.getTemperament());
        horse.setRequiredStall(stall);
        horse.setHandlingNotes(trimToNull(request.getHandlingNotes()));
        horse.setSizeClass(HorseSizing.sizeClassFor(height, stall, sizeClasses.findAllByOrderByMinHeightHhAsc()));
    }

    /**
     * The database's unique indexes are the backstop for two saves racing past the checks above.
     */
    Horse saveChecked(Horse horse) {
        try {
            return horses.saveAndFlush(horse);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("HORSE_DUPLICATE", "Another horse with this name or microchip was saved "
                    + "at the same moment. Reload your horses and try again.");
        }
    }

    private void requireNameFree(Club club, Horse horse, String name) {
        horses.findFirstByClubIdAndNameIgnoreCaseAndArchivedAtIsNull(club.getId(), name)
                .filter(other -> !other.getId().equals(horse.getId()))
                .ifPresent(other -> {
                    throw new ConflictException("HORSE_NAME_TAKEN",
                            club.getName() + " already has an active horse named " + other.getName() + ".");
                });
    }

    private void requireMicrochipFree(Horse horse, String microchip) {
        horses.findByMicrochip(microchip)
                .filter(other -> !other.getId().equals(horse.getId()))
                .ifPresent(other -> {
                    throw new ConflictException("MICROCHIP_REGISTERED", "Microchip " + microchip + " is already "
                            + "registered. Check it against the passport, or contact us if the horse changed owners.");
                });
    }
}
