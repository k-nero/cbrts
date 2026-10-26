package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.route.CorridorResponse;
import com.equifreight.model.route.CreateCorridorRequest;
import com.equifreight.model.route.DateFlexRequest;
import com.equifreight.service.CorridorService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The routes we run (#115). Any staff member can read them; the fleet & route coordinator adds them, and the
 * coordinator, who knows the roads,
 * and the logistics manager set how far a request's flexible dates can move on each.
 */
@RestController
@RequestMapping("/api/v1/staff/corridors")
public class CorridorController {

    private final CorridorService corridorService;

    public CorridorController(CorridorService corridorService) {
        this.corridorService = corridorService;
    }

    // Sortable: code, originCity, destinationCity, dateFlexDays.
    @GetMapping
    public Page<CorridorResponse> list(
            @PageableDefault(size = 20, sort = "code", direction = Sort.Direction.ASC) Pageable pageable) {
        return corridorService.list(pageable);
    }

    /** A new route with its border crossings; it has no rates until the draft rate version prices it. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('FLEET_COORDINATOR')")
    public CorridorResponse create(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateCorridorRequest request) {
        return corridorService.create(user, request);
    }

    @PutMapping("/{id}/date-flex")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public CorridorResponse setDateFlex(
            @AuthenticationPrincipal User user, @PathVariable UUID id, @Valid @RequestBody DateFlexRequest request) {
        return corridorService.setDateFlexDays(user, id, request.dateFlexDays());
    }
}
