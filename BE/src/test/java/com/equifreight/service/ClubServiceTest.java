package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Club;
import com.equifreight.entity.User;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.repository.ClubRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ClubServiceTest {

    private ClubRepository clubRepository;
    private ClubService clubService;
    private User user;

    @BeforeEach
    void setUp() {
        clubRepository = mock(ClubRepository.class);
        clubService = new ClubService(clubRepository);
        user = new User();
        user.setId(UUID.randomUUID());
    }

    @Test
    void customerWithoutAClubIsRefused() {
        assertThatThrownBy(() -> clubService.requireClub(user))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Your account isn't linked to a club. Contact EquiFreight to finish setting it up.");
        verifyNoInteractions(clubRepository);
    }

    @Test
    void theSignedInUsersClubIsReturned() {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        club.setName("Saigon Turf Club");
        user.setClub(club);
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));

        assertThat(clubService.requireClub(user)).isSameAs(club);
    }

    @Test
    void aClubThatNoLongerExistsIsRefused() {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        user.setClub(club);
        when(clubRepository.findById(club.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clubService.requireClub(user)).isInstanceOf(UnauthorizedException.class);
    }
}
