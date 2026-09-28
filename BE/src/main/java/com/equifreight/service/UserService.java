package com.equifreight.service;

import com.equifreight.entity.Role;
import com.equifreight.entity.User;
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

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
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

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.getByEmail(request.getEmail()) != null) {
            throw new BusinessException("Email already in use");
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRoles(resolveRoles(request.getRoles()));
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(UUID id, UpdateUserRequest request) {
        User user = findOrThrow(id);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            user.setRoles(resolveRoles(request.getRoles()));
        }
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public void delete(UUID id) {
        userRepository.delete(findOrThrow(id));
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
