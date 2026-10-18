package com.equifreight.controller;

import com.equifreight.entity.Club;
import com.equifreight.entity.User;
import com.equifreight.model.user.UserMapper;
import com.equifreight.model.user.UserResponse;
import com.equifreight.service.ClubService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    private final ClubService clubService;

    public MeController(ClubService clubService) {
        this.clubService = clubService;
    }

    @GetMapping
    public UserResponse me(@AuthenticationPrincipal User user) {
        return UserMapper.toResponse(user).toBuilder()
                .clubName(clubService.findClub(user).map(Club::getName).orElse(null))
                .build();
    }
}
