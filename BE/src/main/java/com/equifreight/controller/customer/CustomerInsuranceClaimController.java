package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.model.incident.CustomerInsuranceClaimResponse;
import com.equifreight.service.InsuranceClaimService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** The insurance claims EquiFreight filed on a club's move (US-F5-08), shown under its request. */
@RestController
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerInsuranceClaimController {

    private final InsuranceClaimService claims;

    public CustomerInsuranceClaimController(InsuranceClaimService claims) {
        this.claims = claims;
    }

    @GetMapping("/api/v1/customer/requests/{id}/insurance-claims")
    public List<CustomerInsuranceClaimResponse> ofRequest(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return claims.ofRequest(user, id);
    }
}
