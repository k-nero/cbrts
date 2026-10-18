package com.equifreight.service;

import com.equifreight.entity.Club;
import com.equifreight.entity.User;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClubServiceTest {

    private UserRepository userRepository;
    private ClubService clubService;
    private User user;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        clubService = new ClubService(userRepository);
        user = new User();
        user.setId(UUID.randomUUID());
    }

    @Test
    void customerWithoutAClubIsRefused() {
        when(userRepository.findClubByUserId(user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clubService.requireClub(user))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Your account isn't linked to a club. Contact EquiFreight to finish setting it up.");
    }

    @Test
    void theSignedInUsersClubIsReturned() {
        Club club = new Club();
        club.setName("Saigon Turf Club");
        when(userRepository.findClubByUserId(user.getId())).thenReturn(Optional.of(club));

        assertThat(clubService.requireClub(user)).isSameAs(club);
    }
}
