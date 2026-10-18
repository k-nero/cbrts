package com.equifreight.service;

import com.equifreight.model.role.RoleMapper;
import com.equifreight.model.role.RoleResponse;
import com.equifreight.repository.RoleRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Roles follow the spec and are seeded; the app only reads them.
 */
@Service
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> list() {
        return roleRepository.findAll(Sort.by("name")).stream()
                .map(RoleMapper::toResponse)
                .toList();
    }
}
