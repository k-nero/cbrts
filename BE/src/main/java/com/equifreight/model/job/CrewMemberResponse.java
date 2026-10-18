package com.equifreight.model.job;

import com.equifreight.entity.enums.CrewRole;
import java.util.UUID;
import lombok.Builder;

@Builder
public record CrewMemberResponse(UUID userId, String name, String staffCode, String email, CrewRole crewRole) {}
