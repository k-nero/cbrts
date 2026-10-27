package com.equifreight.model.job;

import com.equifreight.entity.enums.EscortKind;
import java.util.UUID;
import lombok.Builder;

/** An active escort who can be assigned as driver or groom (US-F3-06). */
@Builder
public record CrewCandidateResponse(UUID userId, String name, String staffCode, String email, EscortKind escortKind) {}
