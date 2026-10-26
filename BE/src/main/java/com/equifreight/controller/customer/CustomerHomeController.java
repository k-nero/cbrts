package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.model.home.CustomerHomeResponse;
import com.equifreight.service.CustomerHomeService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customer")
public class CustomerHomeController {

    private final CustomerHomeService home;

    public CustomerHomeController(CustomerHomeService home) {
        this.home = home;
    }

    @Operation(summary = "The signed-in club's Home: what it owes, its moves in progress and its horses")
    @GetMapping("/home")
    public CustomerHomeResponse get(@AuthenticationPrincipal User user) {
        return home.get(user);
    }
}
