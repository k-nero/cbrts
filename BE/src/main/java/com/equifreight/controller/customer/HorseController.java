package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.model.horse.HorseRequest;
import com.equifreight.model.horse.HorseResponse;
import com.equifreight.model.horse.SizeClassResponse;
import com.equifreight.service.HorseService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * My horses (US-F1-00, #12): the signed-in club's horse registry. ApplicationConfiguration limits
 * /api/v1/customer/** to customers; HorseService scopes every horse to the customer's club.
 */
@RestController
@RequestMapping("/api/v1/customer")
public class HorseController {

    private final HorseService horseService;

    public HorseController(HorseService horseService) {
        this.horseService = horseService;
    }

    // Sortable: name, createdAt.
    @GetMapping("/horses")
    public Page<HorseResponse> list(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "archived", defaultValue = "false") boolean archived,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return horseService.list(user, q, archived, pageable);
    }

    @GetMapping("/horses/{id}")
    public HorseResponse get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return horseService.get(user, id);
    }

    @PostMapping("/horses")
    public HorseResponse create(@AuthenticationPrincipal User user, @Valid @RequestBody HorseRequest request) {
        return horseService.create(user, request);
    }

    @PutMapping("/horses/{id}")
    public HorseResponse update(@AuthenticationPrincipal User user, @PathVariable UUID id,
                                @Valid @RequestBody HorseRequest request) {
        return horseService.update(user, id, request);
    }

    /** Archived, never deleted. */
    @PostMapping("/horses/{id}/archive")
    public HorseResponse archive(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return horseService.archive(user, id);
    }

    /** The height bands, so a form can show the derived class as the height is typed. */
    @GetMapping("/horse-size-classes")
    public List<SizeClassResponse> sizeClasses() {
        return horseService.sizeClasses();
    }
}
