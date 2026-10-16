package com.equifreight.service;

import com.equifreight.entity.Club;
import com.equifreight.entity.Horse;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.horse.HorseRequest;
import com.equifreight.model.horse.HorseResponse;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.HorseSizeClassRepository;
import com.equifreight.repository.RequestHorseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class HorseServiceTest {

    private static final UUID CLUB_ID = UUID.fromString("01a1453c-0000-7000-8000-000000000001");
    private static final List<HorseSizeClass> CLASSES = List.of(
            sizeClass("S", 32, "10.0"),
            sizeClass("M", 32, "14.3"),
            sizeClass("L", 48, "16.3"),
            sizeClass("XL", 96, "17.3"));

    private HorseRepository horses;
    private HorseSizeClassRepository sizeClasses;
    private RequestHorseRepository requestHorses;
    private ClubService clubs;
    private HorseService service;
    private User user;
    private Club club;

    @BeforeEach
    void setUp() {
        horses = mock(HorseRepository.class);
        sizeClasses = mock(HorseSizeClassRepository.class);
        requestHorses = mock(RequestHorseRepository.class);
        clubs = mock(ClubService.class);
        service = new HorseService(horses, sizeClasses, requestHorses, clubs);

        club = new Club();
        club.setId(CLUB_ID);
        club.setName("Saigon Turf Club");
        user = new User();
        user.setId(UUID.randomUUID());

        when(clubs.requireClub(user)).thenReturn(club);
        when(sizeClasses.findAllByOrderByMinHeightHhAsc()).thenReturn(CLASSES);
        when(horses.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(horses.findFirstByClubIdAndNameIgnoreCaseAndArchivedAtIsNull(any(), anyString())).thenReturn(Optional.empty());
        when(horses.findByMicrochip(anyString())).thenReturn(Optional.empty());
        when(requestHorses.findHorseIdsOnSubmittedRequests(any())).thenReturn(Set.of());
    }

    @Test
    void createDerivesTheSizeClassFromHeight() {
        HorseResponse response = service.create(user, nightfallRequest());

        assertThat(response.getSizeClass().getCode()).isEqualTo("M");
        assertThat(response.getSizeClass().getWidthIn()).isEqualTo((short) 32);
    }

    @Test
    void createStoresTheMicrochipWithoutSpaces() {
        HorseRequest request = nightfallRequest();
        request.setMicrochip("250 259 600 223 311");

        service.create(user, request);

        assertThat(savedHorse().getMicrochip()).isEqualTo("250259600223311");
    }

    @Test
    void createRefusesAMicrochipThatIsNot15Digits() {
        HorseRequest shortChip = nightfallRequest();
        shortChip.setMicrochip("25025960022331");
        assertThatThrownBy(() -> service.create(user, shortChip))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A microchip is 15 digits; 25025960022331 has 14.")
                .extracting("code").isEqualTo("INVALID_MICROCHIP");

        HorseRequest letters = nightfallRequest();
        letters.setMicrochip("25025960022331X");
        assertThatThrownBy(() -> service.create(user, letters))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A microchip is 15 digits; 25025960022331X has letters or symbols.");
    }

    @Test
    void createRefusesADuplicateActiveNameIgnoringCase() {
        Horse existing = horse("Nightfall", "250259600223311");
        when(horses.findFirstByClubIdAndNameIgnoreCaseAndArchivedAtIsNull(CLUB_ID, "NIGHTFALL"))
                .thenReturn(Optional.of(existing));
        HorseRequest request = nightfallRequest();
        request.setName("NIGHTFALL");
        request.setMicrochip("111222333444555");

        assertThatThrownBy(() -> service.create(user, request))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Saigon Turf Club already has an active horse named Nightfall.")
                .extracting("code").isEqualTo("HORSE_NAME_TAKEN");
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
                .extracting("code").isEqualTo("MICROCHIP_REGISTERED");
        verify(horses, never()).saveAndFlush(any());
    }

    @Test
    void createRefusesADateOfBirthAfterToday() {
        HorseRequest request = nightfallRequest();
        request.setDateOfBirth(LocalDate.of(2999, 1, 1));

        assertThatThrownBy(() -> service.create(user, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("The date of birth 1 Jan 2999 is after today.")
                .extracting("code").isEqualTo("INVALID_DATE_OF_BIRTH");
    }

    @Test
    void createTrimsTextAndDefaultsStallAndCurrency() {
        HorseRequest request = nightfallRequest();
        request.setName(" Nightfall ");
        request.setBreed("   ");
        request.setPassportNo(" VN-PP-2022-0188 ");
        request.setRequiredStall(null);

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
                .extracting("code").isEqualTo("HORSE_DUPLICATE");
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

        assertThat(service.get(user, nightfall.getId()).isIdentityLocked()).isTrue();
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

        assertThat(page).extracting(HorseResponse::isIdentityLocked).containsExactly(true, false);
        verify(requestHorses, times(1)).findHorseIdsOnSubmittedRequests(argThat((Collection<UUID> ids) ->
                ids.size() == 2 && ids.contains(nightfall.getId()) && ids.contains(shadowfax.getId())));
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

    private static HorseRequest nightfallRequest() {
        HorseRequest request = new HorseRequest();
        request.setName("Nightfall");
        request.setSex(HorseSex.MARE);
        request.setHeightHh(new BigDecimal("16.0"));
        request.setMicrochip("250259600223311");
        request.setPassportNo("VN-PP-2022-0188");
        request.setDeclaredValue(new BigDecimal("240000"));
        request.setRequiredStall(StallType.CLIMATE);
        return request;
    }

    private static HorseSizeClass sizeClass(String code, int widthIn, String minHeightHh) {
        HorseSizeClass sizeClass = new HorseSizeClass();
        sizeClass.setId(UUID.randomUUID());
        sizeClass.setCode(code);
        sizeClass.setWidthIn((short) widthIn);
        sizeClass.setMinHeightHh(new BigDecimal(minHeightHh));
        return sizeClass;
    }
}
