package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.equifreight.entity.Club;
import com.equifreight.entity.Horse;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.HorseCoat;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.StallType;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.horse.HorseRequest;
import com.equifreight.model.horse.HorseResponse;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.HorseSizeClassRepository;
import com.equifreight.repository.RequestHorseRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

class HorseServiceTest {

    private static final UUID CLUB_ID = UUID.fromString("01a1453c-0000-7000-8000-000000000001");
    private static final List<HorseSizeClass> CLASSES = List.of(
            sizeClass("S", 32, "10.0"),
            sizeClass("M", 32, "14.3"),
            sizeClass("L", 48, "16.3"),
            sizeClass("XL", 96, "17.3"));

    private HorseRepository horses;
    private RequestHorseRepository requestHorses;
    private HorseService service;
    private User user;
    private Club club;

    private static HorseRequest requestFrom(Horse horse) {
        return HorseRequest.builder()
                .name(horse.getName())
                .sex(horse.getSex())
                .coat(horse.getCoat())
                .breed(horse.getBreed())
                .dateOfBirth(horse.getDateOfBirth())
                .heightHh(horse.getHeightHh())
                .weightKg(horse.getWeightKg())
                .microchip(horse.getMicrochip())
                .passportNo(horse.getPassportNo())
                .declaredValue(horse.getDeclaredValue())
                .requiredStall(horse.getRequiredStall())
                .build();
    }

    private static RequestHorseRepository.HorseUse use(String code, RequestStatus status) {
        return new RequestHorseRepository.HorseUse() {
            @Override
            public String getCode() {
                return code;
            }

            @Override
            public RequestStatus getStatus() {
                return status;
            }
        };
    }

    private static HorseRequest nightfallRequest() {
        return HorseRequest.builder()
                .name("Nightfall")
                .sex(HorseSex.MARE)
                .heightHh(new BigDecimal("16.0"))
                .microchip("250259600223311")
                .passportNo("VN-PP-2022-0188")
                .declaredValue(new BigDecimal("240000"))
                .requiredStall(StallType.CLIMATE)
                .build();
    }

    private static HorseSizeClass sizeClass(String code, int widthIn, String minHeightHh) {
        HorseSizeClass sizeClass = new HorseSizeClass();
        sizeClass.setId(UUID.randomUUID());
        sizeClass.setCode(code);
        sizeClass.setWidthIn((short) widthIn);
        sizeClass.setMinHeightHh(new BigDecimal(minHeightHh));
        return sizeClass;
    }

    @BeforeEach
    void setUp() {
        horses = mock(HorseRepository.class);
        HorseSizeClassRepository sizeClasses = mock(HorseSizeClassRepository.class);
        requestHorses = mock(RequestHorseRepository.class);
        ClubService clubs = mock(ClubService.class);
        service = new HorseService(horses, sizeClasses, requestHorses, clubs);

        club = new Club();
        club.setId(CLUB_ID);
        club.setName("Saigon Turf Club");
        user = new User();
        user.setId(UUID.randomUUID());

        when(clubs.requireClub(user)).thenReturn(club);
        when(sizeClasses.findAllByOrderByMinHeightHhAsc()).thenReturn(CLASSES);
        when(horses.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(horses.findFirstByClubIdAndNameIgnoreCaseAndArchivedAtIsNull(any(), anyString()))
                .thenReturn(Optional.empty());
        when(horses.findByMicrochip(anyString())).thenReturn(Optional.empty());
        when(requestHorses.findHorseIdsOnSubmittedRequests(any())).thenReturn(Set.of());
    }

    @Test
    void createDerivesTheSizeClassFromHeight() {
        HorseResponse response = service.create(user, nightfallRequest());

        assertThat(response.sizeClass().code()).isEqualTo("M");
        assertThat(response.sizeClass().widthIn()).isEqualTo((short) 32);
    }

    @Test
    void createStoresTheMicrochipWithoutSpaces() {
        HorseRequest request =
                nightfallRequest().toBuilder().microchip("250 259 600 223 311").build();

        service.create(user, request);

        assertThat(savedHorse().getMicrochip()).isEqualTo("250259600223311");
    }

    @Test
    void createRefusesAMicrochipThatIsNot15Digits() {
        HorseRequest shortChip =
                nightfallRequest().toBuilder().microchip("25025960022331").build();
        assertThatThrownBy(() -> service.create(user, shortChip))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A microchip is 15 digits; 25025960022331 has 14.")
                .extracting("code")
                .isEqualTo("INVALID_MICROCHIP");

        HorseRequest letters =
                nightfallRequest().toBuilder().microchip("25025960022331X").build();
        assertThatThrownBy(() -> service.create(user, letters))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A microchip is 15 digits; 25025960022331X has letters or symbols.");
    }

    @Test
    void createRefusesAMicrochipWithNonAsciiDigits() {
        HorseRequest request =
                nightfallRequest().toBuilder().microchip("２５０２５９６００２２３３１１").build();

        assertThatThrownBy(() -> service.create(user, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A microchip is 15 digits; ２５０２５９６００２２３３１１ has letters or symbols.")
                .extracting("code")
                .isEqualTo("INVALID_MICROCHIP");
    }

    @Test
    void createStripsNonBreakingSpacesFromTheMicrochip() {
        HorseRequest request =
                nightfallRequest().toBuilder().microchip("250 259 600 223 311").build();

        service.create(user, request);

        assertThat(savedHorse().getMicrochip()).isEqualTo("250259600223311");
    }

    @Test
    void createRefusesADuplicateActiveNameIgnoringCase() {
        Horse existing = horse("Nightfall", "250259600223311");
        when(horses.findFirstByClubIdAndNameIgnoreCaseAndArchivedAtIsNull(CLUB_ID, "NIGHTFALL"))
                .thenReturn(Optional.of(existing));
        HorseRequest request = nightfallRequest().toBuilder()
                .name("NIGHTFALL")
                .microchip("111222333444555")
                .build();

        assertThatThrownBy(() -> service.create(user, request))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Saigon Turf Club already has an active horse named Nightfall.")
                .extracting("code")
                .isEqualTo("HORSE_NAME_TAKEN");
        verify(horses, never()).saveAndFlush(any());
    }

    @Test
    void createRefusesAMicrochipRegisteredToAnyClub() {
        Club otherClub = new Club();
        otherClub.setId(UUID.randomUUID());
        otherClub.setName("Đà Lạt Highland Stables");
        Horse elsewhere = horse("Langbiang Star", "250259600223311");
        elsewhere.setClub(otherClub);
        when(horses.findByMicrochip("250259600223311")).thenReturn(Optional.of(elsewhere));

        assertThatThrownBy(() -> service.create(user, nightfallRequest()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Microchip 250259600223311 is already registered. Check it against the passport, "
                        + "or contact us if the horse changed owners.")
                .extracting("code")
                .isEqualTo("MICROCHIP_REGISTERED");
        verify(horses, never()).saveAndFlush(any());
    }

    @Test
    void createRefusesADateOfBirthAfterToday() {
        HorseRequest request = nightfallRequest().toBuilder()
                .dateOfBirth(LocalDate.of(2999, 1, 1))
                .build();

        assertThatThrownBy(() -> service.create(user, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("The date of birth 1 Jan 2999 is after today.")
                .extracting("code")
                .isEqualTo("INVALID_DATE_OF_BIRTH");
    }

    @Test
    void createTrimsTextAndDefaultsStallAndCurrency() {
        HorseRequest request = nightfallRequest().toBuilder()
                .name(" Nightfall ")
                .breed("   ")
                .passportNo(" VN-PP-2022-0188 ")
                .requiredStall(null)
                .build();

        service.create(user, request);

        Horse saved = savedHorse();
        assertThat(saved.getName()).isEqualTo("Nightfall");
        assertThat(saved.getBreed()).isNull();
        assertThat(saved.getPassportNo()).isEqualTo("VN-PP-2022-0188");
        assertThat(saved.getRequiredStall()).isEqualTo(StallType.STANDARD);
        assertThat(saved.getValueCurrency()).isEqualTo("USD");
        assertThat(saved.getClub()).isSameAs(club);
    }

    @Test
    void createMapsARaceOnTheUniqueIndexesToAConflict() {
        when(horses.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("horses_microchip_key"));

        assertThatThrownBy(() -> service.create(user, nightfallRequest()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Another horse with this name or microchip was saved at the same moment. "
                        + "Reload your horses and try again.")
                .extracting("code")
                .isEqualTo("HORSE_DUPLICATE");
    }

    @Test
    void getAnotherClubsHorseAnswersNotFound() {
        UUID id = UUID.randomUUID();
        when(horses.findByIdAndClubId(id, CLUB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(user, id)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getMarksAHorseThatWasOnASubmittedRequestAsIdentityLocked() {
        Horse nightfall = horse("Nightfall", "250259600223311");
        when(horses.findByIdAndClubId(nightfall.getId(), CLUB_ID)).thenReturn(Optional.of(nightfall));
        when(requestHorses.findHorseIdsOnSubmittedRequests(any())).thenReturn(Set.of(nightfall.getId()));

        assertThat(service.get(user, nightfall.getId()).identityLocked()).isTrue();
    }

    @Test
    void listMarksOnlyTheHorsesThatWereOnASubmittedRequest() {
        Horse nightfall = horse("Nightfall", "250259600223311");
        Horse shadowfax = horse("Shadowfax", "250259600123456");
        Pageable pageable = PageRequest.of(0, 20);
        when(horses.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(nightfall, shadowfax), pageable, 2));
        when(requestHorses.findHorseIdsOnSubmittedRequests(any())).thenReturn(Set.of(nightfall.getId()));

        List<HorseResponse> page = service.list(user, null, false, pageable).getContent();

        assertThat(page).extracting(HorseResponse::identityLocked).containsExactly(true, false);
        verify(requestHorses, times(1))
                .findHorseIdsOnSubmittedRequests(argThat((Collection<UUID> ids) ->
                        ids.size() == 2 && ids.contains(nightfall.getId()) && ids.contains(shadowfax.getId())));
    }

    @Test
    void identityFieldsCanChangeBeforeAnySubmittedRequest() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));
        HorseRequest request =
                requestFrom(nightfall).toBuilder().name("Nightfall II").build();

        service.update(user, nightfall.getId(), request);

        assertThat(savedHorse().getName()).isEqualTo("Nightfall II");
    }

    @Test
    void changingIdentityAfterASubmittedRequestIsRefused() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));
        when(requestHorses.findSubmittedRequestCodes(nightfall.getId())).thenReturn(List.of("REQ-2026-0193"));
        HorseRequest request = requestFrom(nightfall).toBuilder()
                .name("Nightfall II")
                .sex(HorseSex.FILLY)
                .build();

        assertThatThrownBy(() -> service.update(user, nightfall.getId(), request))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Name and sex can't be changed: Nightfall travelled on REQ-2026-0193. "
                        + "Ask the transport specialist to correct them against her passport.")
                .extracting("code")
                .isEqualTo("HORSE_IDENTITY_LOCKED");
        verify(horses, never()).saveAndFlush(any());
    }

    @Test
    void oneLockedFieldUsesSingularWording() {
        Horse nightfall = horse("Nightfall", "250259600223311");
        nightfall.setCoat(HorseCoat.BLACK);
        owned(nightfall);
        when(requestHorses.findSubmittedRequestCodes(nightfall.getId())).thenReturn(List.of("REQ-2026-0193"));
        HorseRequest request =
                requestFrom(nightfall).toBuilder().coat(HorseCoat.BAY).build();

        assertThatThrownBy(() -> service.update(user, nightfall.getId(), request))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Coat can't be changed: Nightfall travelled on REQ-2026-0193. "
                        + "Ask the transport specialist to correct it against her passport.");
    }

    @Test
    void resendingTheSameIdentityInADifferentFormatPassesWhenLocked() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));
        when(requestHorses.findSubmittedRequestCodes(nightfall.getId())).thenReturn(List.of("REQ-2026-0193"));
        HorseRequest request = requestFrom(nightfall).toBuilder()
                .microchip("250 259 600 223 311")
                .name("Nightfall ")
                .weightKg((short) 480)
                .build();

        HorseResponse response = service.update(user, nightfall.getId(), request);

        assertThat(savedHorse().getWeightKg()).isEqualTo((short) 480);
        assertThat(response.identityLocked()).isTrue();
    }

    @Test
    void aLockedMicrochipResentWithNonBreakingSpacesPasses() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));
        when(requestHorses.findSubmittedRequestCodes(nightfall.getId())).thenReturn(List.of("REQ-2026-0193"));
        HorseRequest request = requestFrom(nightfall).toBuilder()
                .microchip("250 259 600 223 311")
                .build();

        service.update(user, nightfall.getId(), request);

        assertThat(savedHorse().getMicrochip()).isEqualTo("250259600223311");
    }

    @Test
    void nonIdentityFieldsStayEditableWhenLocked() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));
        when(requestHorses.findSubmittedRequestCodes(nightfall.getId())).thenReturn(List.of("REQ-2026-0193"));
        HorseRequest request = requestFrom(nightfall).toBuilder()
                .declaredValue(new BigDecimal("250000"))
                .handlingNotes("Kicks at the partition when the trailer stops.")
                .build();

        service.update(user, nightfall.getId(), request);

        Horse saved = savedHorse();
        assertThat(saved.getDeclaredValue()).isEqualByComparingTo("250000");
        assertThat(saved.getHandlingNotes()).isEqualTo("Kicks at the partition when the trailer stops.");
    }

    @Test
    void updatingAnArchivedHorseIsRefused() {
        Horse nightfall = horse("Nightfall", "250259600223311");
        nightfall.setArchivedAt(Instant.parse("2026-10-01T03:00:00Z"));
        owned(nightfall);

        assertThatThrownBy(() -> service.update(user, nightfall.getId(), requestFrom(nightfall)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Nightfall is archived. Archived horses can't be edited.")
                .extracting("code")
                .isEqualTo("HORSE_ARCHIVED");
    }

    @Test
    void updateDoesNotCountTheHorseAsItsOwnDuplicate() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));
        when(horses.findFirstByClubIdAndNameIgnoreCaseAndArchivedAtIsNull(CLUB_ID, "Nightfall"))
                .thenReturn(Optional.of(nightfall));
        when(horses.findByMicrochip("250259600223311")).thenReturn(Optional.of(nightfall));

        service.update(user, nightfall.getId(), requestFrom(nightfall));

        verify(horses).saveAndFlush(nightfall);
    }

    @Test
    void archiveIsRefusedWhileTheHorseIsOnARequestInReview() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));
        when(requestHorses.findActiveUses(eq(nightfall.getId()), any()))
                .thenReturn(List.of(use("REQ-2026-0193", RequestStatus.UNDER_REVIEW)));

        assertThatThrownBy(() -> service.archive(user, nightfall.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Nightfall is on REQ-2026-0193, which is in review. Archive her after it ends.")
                .extracting("code")
                .isEqualTo("HORSE_IN_USE");
        verify(horses, never()).saveAndFlush(any());
    }

    @Test
    void archiveIsRefusedWhileTheHorseIsOnAnUnclosedJob() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));
        when(requestHorses.findActiveUses(eq(nightfall.getId()), any()))
                .thenReturn(List.of(use("REQ-2026-0162", RequestStatus.APPROVED)));

        assertThatThrownBy(() -> service.archive(user, nightfall.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Nightfall is on REQ-2026-0162, which is an approved job that hasn't closed. "
                        + "Archive her after it ends.");
    }

    @Test
    void archiveChecksOnlyTheActiveStatuses() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));

        service.archive(user, nightfall.getId());

        verify(requestHorses)
                .findActiveUses(
                        eq(nightfall.getId()),
                        argThat((Collection<RequestStatus> statuses) -> Set.copyOf(statuses)
                                .equals(EnumSet.of(
                                        RequestStatus.SUBMITTED,
                                        RequestStatus.UNDER_REVIEW,
                                        RequestStatus.INFO_REQUIRED,
                                        RequestStatus.QUOTED,
                                        RequestStatus.CUSTOMER_ACCEPTED))));
    }

    @Test
    void archiveSetsArchivedAtWhenNothingActiveRemains() {
        Horse nightfall = owned(horse("Nightfall", "250259600223311"));

        HorseResponse response = service.archive(user, nightfall.getId());

        assertThat(savedHorse().getArchivedAt()).isNotNull();
        assertThat(response.archivedAt()).isNotNull();
    }

    @Test
    void archivingAnArchivedHorseChangesNothing() {
        Horse nightfall = horse("Nightfall", "250259600223311");
        Instant archivedAt = Instant.parse("2026-10-01T03:00:00Z");
        nightfall.setArchivedAt(archivedAt);
        owned(nightfall);

        HorseResponse response = service.archive(user, nightfall.getId());

        assertThat(response.archivedAt()).isEqualTo(archivedAt);
        verify(horses, never()).saveAndFlush(any());
    }

    private Horse owned(Horse horse) {
        when(horses.findByIdAndClubId(horse.getId(), CLUB_ID)).thenReturn(Optional.of(horse));
        return horse;
    }

    private Horse savedHorse() {
        ArgumentCaptor<Horse> captor = ArgumentCaptor.forClass(Horse.class);
        verify(horses).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private Horse horse(String name, String microchip) {
        Horse horse = new Horse();
        horse.setId(UUID.randomUUID());
        horse.setClub(club);
        horse.setName(name);
        horse.setSex(HorseSex.MARE);
        horse.setHeightHh(new BigDecimal("16.0"));
        horse.setSizeClass(CLASSES.get(1));
        horse.setMicrochip(microchip);
        horse.setPassportNo("VN-PP-2022-0188");
        horse.setDeclaredValue(new BigDecimal("240000"));
        return horse;
    }
}
