package com.equifreight.configuration;

import com.equifreight.entity.Club;
import com.equifreight.entity.Horse;
import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.HorseCoat;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.Temperament;
import com.equifreight.repository.ClubRepository;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.HorseRepository;
import com.equifreight.repository.HorseSizeClassRepository;
import com.equifreight.repository.RoleRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.HorseSizing;
import lombok.extern.log4j.Log4j2;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Seeds the five roles and one demo account per role (the people in the Figma demo data), the customer's
 * club and its four horses (docs/figma-plugin/src/03-pages.js, HORSES), and the route catalog through
 * {@link CatalogSeeder}. Every value is a demo placeholder.
 * Idempotent: existing roles, emails, clubs and microchips are left alone.
 */
@Component
@Log4j2
public class DataSeeder implements ApplicationRunner {

    private static final String[][] ROLES = {
            { RoleName.CUSTOMER, "Racing club or horse owner" },
            { RoleName.LOGISTICS_MANAGER, "Reviews requests, issues quotations, owns escalations" },
            { RoleName.TRANSPORT_SPECIALIST, "Checks documents, files with authorities, keeps the catalogs" },
            { RoleName.FLEET_COORDINATOR, "Plans routes, vehicles and stall positions" },
            { RoleName.ESCORT, "Driver or groom on the trip" }
    };

    /** email, first name, last name, role */
    private static final String[][] USERS = {
            { "bookings@saigonturf.vn", "Saigon Turf", "Club", RoleName.CUSTOMER },
            { "yen.vu@equifreight.vn", "Hải Yến", "Vũ", RoleName.LOGISTICS_MANAGER },
            { "lan.nguyen@equifreight.vn", "Thị Lan", "Nguyễn", RoleName.TRANSPORT_SPECIALIST },
            { "khoi.do@equifreight.vn", "Minh Khôi", "Đỗ", RoleName.FLEET_COORDINATOR },
            { "minh.tran@equifreight.vn", "Văn Minh", "Trần", RoleName.ESCORT }
    };

    private static final String CLUB_NAME = "Saigon Turf Club";
    private static final String CLUB_EMAIL = "bookings@saigonturf.vn";

    private record DemoHorse(String name, HorseCoat coat, String breed, HorseSex sex, LocalDate born,
                             String heightHh, int weightKg, StallType stall, Temperament temperament,
                             String value, String microchip, String passportNo, String notes) {}

    private static final List<DemoHorse> HORSES = List.of(
            new DemoHorse("Shadowfax", HorseCoat.GREY, "Andalusian", HorseSex.GELDING, LocalDate.of(2019, 5, 10),
                    "16.2", 510, StallType.STANDARD, Temperament.CALM, "85000", "250259600123456",
                    "VN-PP-2019-0412",
                    "Annual vaccinations up to date. No known allergies. Loads best in a quiet yard."),
            new DemoHorse("Nightfall", HorseCoat.BLACK, "Thoroughbred", HorseSex.MARE, LocalDate.of(2022, 4, 14),
                    "16.0", 478, StallType.CLIMATE, Temperament.NERVOUS, "240000", "250259600223311",
                    "VN-PP-2022-0188",
                    "Sensitive to loud noise. Needs a slow, gentle load and a climate-controlled stall."),
            new DemoHorse("Copper King", HorseCoat.CHESTNUT, "Quarter Horse", HorseSex.STALLION,
                    LocalDate.of(2017, 2, 20), "15.3", 583, StallType.BOX, Temperament.AGGRESSIVE, "120000",
                    "985141000876502", "VN-PP-2017-0093",
                    "Box stall only. Never next to a mare. Experienced handlers only."),
            new DemoHorse("Silver Bell", HorseCoat.GREY, "Lipizzan", HorseSex.MARE, LocalDate.of(2020, 6, 8),
                    "15.1", 445, StallType.STANDARD, Temperament.CALM, "60000", "203098100554120",
                    "VN-PP-2020-0257", "Travels well. Hay net at shoulder height."));

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final CountryRepository countryRepository;
    private final HorseRepository horseRepository;
    private final HorseSizeClassRepository sizeClassRepository;
    private final CatalogSeeder catalogSeeder;
    private final PasswordEncoder passwordEncoder;
    private final String seedPassword;

    public DataSeeder(RoleRepository roleRepository, UserRepository userRepository, ClubRepository clubRepository,
                      CountryRepository countryRepository, HorseRepository horseRepository,
                      HorseSizeClassRepository sizeClassRepository, CatalogSeeder catalogSeeder,
                      PasswordEncoder passwordEncoder,
                      @Value("${app.seed.default.password}") String seedPassword) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.clubRepository = clubRepository;
        this.countryRepository = countryRepository;
        this.horseRepository = horseRepository;
        this.sizeClassRepository = sizeClassRepository;
        this.catalogSeeder = catalogSeeder;
        this.passwordEncoder = passwordEncoder;
        this.seedPassword = seedPassword;
    }

    @Override
    @Transactional
    public void run(@NonNull ApplicationArguments args) {
        for (String[] r : ROLES) {
            if (roleRepository.findByName(r[0]).isEmpty()) {
                Role role = new Role();
                role.setName(r[0]);
                role.setDescription(r[1]);
                roleRepository.save(role);
                log.info("Seeded role {}", r[0]);
            }
        }
        for (String[] u : USERS) {
            if (userRepository.getByEmail(u[0]) != null) {
                continue;
            }
            User user = new User();
            user.setEmail(u[0]);
            user.setFirstName(u[1]);
            user.setLastName(u[2]);
            user.setPassword(passwordEncoder.encode(seedPassword));
            user.setRoles(Set.of(roleRepository.findByName(u[3]).orElseThrow()));
            userRepository.save(user);
            log.info("Seeded {} ({})", u[0], u[3]);
        }
        // After the accounts: the regulation versions name the transport specialist who published them.
        catalogSeeder.seed();
        Club club = seedClub();
        seedHorses(club);
    }

    /** Saigon Turf Club, linked to the customer account (one account per club). */
    private Club seedClub() {
        Club club = clubRepository.findByBookingEmail(CLUB_EMAIL).orElseGet(() -> {
            Club created = new Club();
            created.setName(CLUB_NAME);
            created.setBookingEmail(CLUB_EMAIL);
            created.setCountry(countryRepository.getReferenceById("VN"));
            log.info("Seeded club {}", CLUB_NAME);
            return clubRepository.save(created);
        });
        User customer = userRepository.getByEmail(CLUB_EMAIL);
        if (customer != null && customer.getClub() == null) {
            customer.setClub(club);
            userRepository.save(customer);
            log.info("Linked {} to {}", CLUB_EMAIL, CLUB_NAME);
        }
        return club;
    }

    /**
     * Only into a club that has never had a horse: a demo horse edited through the API (a new name or
     * microchip) must not come back, or collide with its edited self on the unique name, on the next start.
     */
    private void seedHorses(Club club) {
        if (horseRepository.existsByClubId(club.getId())) {
            return;
        }
        List<HorseSizeClass> classes = sizeClassRepository.findAllByOrderByMinHeightHhAsc();
        for (DemoHorse demo : HORSES) {
            if (horseRepository.findByMicrochip(demo.microchip()).isPresent()) {
                continue;
            }
            BigDecimal height = new BigDecimal(demo.heightHh());
            Horse horse = new Horse();
            horse.setClub(club);
            horse.setName(demo.name());
            horse.setCoat(demo.coat());
            horse.setBreed(demo.breed());
            horse.setSex(demo.sex());
            horse.setDateOfBirth(demo.born());
            horse.setHeightHh(height);
            horse.setWeightKg((short) demo.weightKg());
            horse.setRequiredStall(demo.stall());
            horse.setTemperament(demo.temperament());
            horse.setDeclaredValue(new BigDecimal(demo.value()));
            horse.setMicrochip(demo.microchip());
            horse.setPassportNo(demo.passportNo());
            horse.setHandlingNotes(demo.notes());
            horse.setSizeClass(HorseSizing.sizeClassFor(height, demo.stall(), classes));
            horseRepository.save(horse);
            log.info("Seeded horse {}", demo.name());
        }
    }
}
