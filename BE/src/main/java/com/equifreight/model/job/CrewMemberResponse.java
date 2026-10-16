package com.equifreight.model.job;

import com.equifreight.entity.enums.CrewRole;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
public class CrewMemberResponse {
    private UUID userId;
    private String name;
    private String staffCode;
    private String email;
    private CrewRole crewRole;
}
