package com.equifreight.controller.admin;

import com.equifreight.entity.User;
import com.equifreight.model.user.CreateUserRequest;
import com.equifreight.model.user.UpdateUserRequest;
import com.equifreight.model.user.UserResponse;
import com.equifreight.service.UserService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Users & roles (logistics manager). Access is enforced on /api/v1/admin/** in ApplicationConfiguration.
 */
@RestController
@RequestMapping("/api/v1/admin/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // Sortable: firstName, lastName, createdAt (DESIGN.md, Tables: Name, Jobs, Last active once those exist).
    @GetMapping
    public Page<UserResponse> list(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "role", required = false) String role,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return userService.search(q, role, pageable);
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable UUID id) {
        return userService.get(id);
    }

    @PostMapping
    public UserResponse create(@Valid @RequestBody CreateUserRequest request, @AuthenticationPrincipal User actor) {
        return userService.create(request, actor);
    }

    @PutMapping("/{id}")
    public UserResponse update(
            @PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request, @AuthenticationPrincipal User actor) {
        return userService.update(id, request, actor);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal User actor) {
        userService.delete(id, actor);
        return ResponseEntity.noContent().build();
    }
}
