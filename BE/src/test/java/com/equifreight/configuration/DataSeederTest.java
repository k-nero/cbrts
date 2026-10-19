package com.equifreight.configuration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.equifreight.entity.Club;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.repository.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

class DataSeederTest {

    private static final UUID CLUB_ID = UUID.fromString("01a1453c-0000-7000-8000-000000000001");

    private HorseRepository horses;
    private DataSeeder seeder;

    private static HorseSizeClass sizeClass(String code, String minHeightHh) {
        HorseSizeClass sizeClass = new HorseSizeClass();
        sizeClass.setCode(code);
        sizeClass.setMinHeightHh(new BigDecimal(minHeightHh));
        return sizeClass;
    }

    @BeforeEach
    void setUp() {
        RoleRepository roles = mock(RoleRepository.class);
        UserRepository users = mock(UserRepository.class);
        ClubRepository clubs = mock(ClubRepository.class);
        HorseSizeClassRepository sizeClasses = mock(HorseSizeClassRepository.class);
        horses = mock(HorseRepository.class);
        seeder = new DataSeeder(
                roles,
                users,
                mock(PasswordEncoder.class),
                "changeme123!",
                mock(CountryRepository.class),
                mock(PlaceRepository.class),
                mock(BorderCrossingRepository.class),
                mock(CorridorRepository.class),
                clubs,
                sizeClasses,
                horses,
                mock(VehicleRepository.class),
                mock(VehicleStallRepository.class),
                mock(RateCatalogVersionRepository.class),
                mock(TransportRequestRepository.class),
                mock(QuotationRepository.class),
                mock(TransportJobRepository.class),
                mock(LoadPlanRepository.class),
                mock(LoadPlanStallRepository.class),
                mock(RoutePlanRepository.class),
                mock(RouteStopRepository.class),
                mock(RouteLegRepository.class),
                mock(CrewAssignmentRepository.class),
                mock(CodeCounterRepository.class),
                mock(RegulationCatalogRepository.class),
                mock(RegulationVersionRepository.class),
                mock(RegulationRuleRepository.class),
                mock(DocumentTypeRepository.class),
                mock(JobRegulationPinRepository.class),
                mock(RateServiceClassRepository.class),
                mock(RateVolumeBreakRepository.class),
                mock(RatePolicyRepository.class),
                mock(RateFeeBandRepository.class),
                mock(RateLineRepository.class),
                mock(CatalogSeeder.class));

        Club club = new Club();
        club.setId(CLUB_ID);
        club.setName("Saigon Turf Club");
        User customer = new User();
        customer.setClub(club);
        when(roles.findByName(anyString())).thenReturn(Optional.of(new Role()));
        when(users.getByEmail(anyString())).thenReturn(customer);
        when(clubs.findByBookingEmail("bookings@saigonturf.vn")).thenReturn(Optional.of(club));
        when(sizeClasses.findAllByOrderByMinHeightHhAsc())
                .thenReturn(List.of(
                        sizeClass("S", "10.0"),
                        sizeClass("M", "14.3"),
                        sizeClass("L", "16.3"),
                        sizeClass("XL", "17.3")));
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
}
