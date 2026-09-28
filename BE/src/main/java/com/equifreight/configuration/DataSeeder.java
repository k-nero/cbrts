package com.equifreight.configuration;

import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.repository.RoleRepository;
import com.equifreight.repository.UserRepository;
import lombok.extern.log4j.Log4j2;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Seeds the five roles and one demo account per role (the people in the Figma demo data).
 * Idempotent: existing roles and emails are left alone.
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

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedPassword;

    public DataSeeder(RoleRepository roleRepository, UserRepository userRepository, PasswordEncoder passwordEncoder,
                      @Value("${app.seed.default.password}") String seedPassword) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
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
    }
}
