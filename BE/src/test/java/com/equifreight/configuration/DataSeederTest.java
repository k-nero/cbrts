package com.equifreight.configuration;

import com.equifreight.entity.Club;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.repository.ClubRepository;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.HorseSizeClassRepository;
import com.equifreight.repository.RoleRepository;
import com.equifreight.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DataSeederTest {

    private static final UUID CLUB_ID = UUID.fromString("01a1453c-0000-7000-8000-000000000001");

    private HorseRepository horses;
    private DataSeeder seeder;

    @BeforeEach
    void setUp() {
        RoleRepository roles = mock(RoleRepository.class);
        UserRepository users = mock(UserRepository.class);
        ClubRepository clubs = mock(ClubRepository.class);
        HorseSizeClassRepository sizeClasses = mock(HorseSizeClassRepository.class);
        horses = mock(HorseRepository.class);
        seeder = new DataSeeder(roles, users, clubs, mock(CountryRepository.class), horses, sizeClasses,
                mock(CatalogSeeder.class), mock(PasswordEncoder.class), "changeme123!");

        Club club = new Club();
        club.setId(CLUB_ID);
        club.setName("Saigon Turf Club");
        User customer = new User();
        customer.setClub(club);
        when(roles.findByName(anyString())).thenReturn(Optional.of(new Role()));
        when(users.getByEmail(anyString())).thenReturn(customer);
        when(clubs.findByBookingEmail("bookings@saigonturf.vn")).thenReturn(Optional.of(club));
        when(sizeClasses.findAllByOrderByMinHeightHhAsc()).thenReturn(List.of(
                sizeClass("S", "10.0"), sizeClass("M", "14.3"), sizeClass("L", "16.3"), sizeClass("XL", "17.3")));
        // A demo horse whose microchip was edited is no longer found by its seeded microchip.
        when(horses.findByMicrochip(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void restartAfterADemoHorseWasEditedAddsNoHorse() {
        when(horses.existsByClubId(CLUB_ID)).thenReturn(true);

        seeder.run(mock(ApplicationArguments.class));

        verify(horses, never()).save(any());
    }

    @Test
    void firstStartSeedsTheFourDemoHorses() {
        when(horses.existsByClubId(CLUB_ID)).thenReturn(false);

        seeder.run(mock(ApplicationArguments.class));

        verify(horses, times(4)).save(any());
    }

    private static HorseSizeClass sizeClass(String code, String minHeightHh) {
        HorseSizeClass sizeClass = new HorseSizeClass();
        sizeClass.setCode(code);
        sizeClass.setMinHeightHh(new BigDecimal(minHeightHh));
        return sizeClass;
    }
}
