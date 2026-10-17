package com.equifreight.service;

import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.user.CreateUserRequest;
import com.equifreight.model.user.UpdateUserRequest;
import com.equifreight.model.user.UserMapper;
import com.equifreight.model.user.UserResponse;
import com.equifreight.repository.RoleRepository;
import com.equifreight.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final JsonMapper jsonMapper;

    private static final String ENTITY_TYPE = "USER";

    public UserService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder,
                       AuditService auditService, JsonMapper jsonMapper) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.jsonMapper = jsonMapper;
    }

    /** q matches email, name or phone; roleName (optional) narrows to accounts holding that role. */
    @Transactional(readOnly = true)
    public Page<UserResponse> search(String q, String roleName, Pageable pageable) {
        Specification<User> spec = (root, cq, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (roleName != null && !roleName.isBlank()) {
                // A user with several roles would otherwise appear once per role row.
                if (cq != null) {
                    cq.distinct(true);
                }
                predicates.add(cb.equal(root.join("roles").get("name"), roleName));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), like),
                        cb.like(cb.lower(root.get("firstName")), like),
                        cb.like(cb.lower(root.get("lastName")), like),
                        cb.like(cb.lower(root.get("phone")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return userRepository.findAll(spec, pageable).map(UserMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse get(UUID id) {
        return UserMapper.toResponse(findOrThrow(id));
    }

    /** Invites a staff account; the actor is the signed-in logistics manager (audited, BR-F1-08). */
    @Transactional
    public UserResponse create(CreateUserRequest request, User actor) {
        if (userRepository.getByEmail(request.getEmail()) != null) {
            throw new BusinessException("Email already in use");
        }
        Set<Role> roles = resolveRoles(request.getRoles());
        User user = new User();
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRoles(roles);
        User saved = userRepository.save(user);
        auditService.recordDecision(actor, "USER_INVITED",
                "Invited %s as %s".formatted(saved.displayName(), roleList(saved.getRoles())),
                ENTITY_TYPE, saved.getId(), saved.getStaffCode(), null,
                null, snapshot(saved));
        return UserMapper.toResponse(saved);
    }

    /** Changes a staff account's name, phone or roles; writes one audit row with what changed. */
    @Transactional
    public UserResponse update(UUID id, UpdateUserRequest request, User actor) {
        User user = findOrThrow(id);
        Set<Role> roles = request.getRoles() != null && !request.getRoles().isEmpty()
                ? resolveRoles(request.getRoles())
                : user.getRoles();
        String before = snapshot(user);
        String oldName = user.displayName();
        List<String> oldRoles = roleNames(user.getRoles());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setRoles(roles);
        User saved = userRepository.save(user);
        String after = snapshot(saved);
        if (!before.equals(after)) {
            String name = saved.displayName();
            String summary = oldRoles.equals(roleNames(roles))
                    ? "Updated %s's account".formatted(name)
                    : "Changed %s's role to %s".formatted(name, roleList(roles));
            if (!oldName.equals(name)) {
                summary += " (was " + oldName + ")";
            }
            auditService.recordDecision(actor, "USER_UPDATED", summary,
                    ENTITY_TYPE, saved.getId(), saved.getStaffCode(), null, before, after);
        }
        return UserMapper.toResponse(saved);
    }

    /** Removes a staff account. The audit row keeps who it was, because the account itself is gone. */
    @Transactional
    public void delete(UUID id, User actor) {
        User user = findOrThrow(id);
        auditService.recordDecision(actor, "USER_REMOVED",
                "Removed %s (%s)".formatted(user.displayName(), roleList(user.getRoles())),
                ENTITY_TYPE, user.getId(), user.getStaffCode(), null,
                snapshot(user), null);
        userRepository.delete(user);
    }

    /** "transport specialist", "fleet & route coordinator and escort". */
    private static String roleList(Set<Role> roles) {
        List<String> labels = roleNames(roles).stream().map(n -> RoleName.label(n).toLowerCase()).toList();
        if (labels.isEmpty()) {
            return "no role";
        }
        return labels.size() == 1 ? labels.getFirst()
                : String.join(", ", labels.subList(0, labels.size() - 1)) + " and " + labels.getLast();
    }

    private static List<String> roleNames(Set<Role> roles) {
        return roles.stream().map(Role::getName).sorted().toList();
    }

    /** The audited fields as JSON: name, email, phone, and role names (never the password). */
    private String snapshot(User user) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("name", user.displayName());
        fields.put("email", user.getEmail());
        fields.put("phone", user.getPhone());
        fields.put("roles", roleNames(user.getRoles()));
        return jsonMapper.writeValueAsString(fields);
    }

    private User findOrThrow(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("User", id));
    }

    private Set<Role> resolveRoles(Set<String> roleNames) {
        Set<Role> roles = new HashSet<>();
        for (String name : roleNames) {
            roles.add(roleRepository.findByName(name)
                    .orElseThrow(() -> new BusinessException("Unknown role: " + name)));
        }
        return roles;
    }
}
