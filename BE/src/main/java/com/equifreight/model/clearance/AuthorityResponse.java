package com.equifreight.model.clearance;

import com.equifreight.entity.enums.AuthorityKind;
import java.util.UUID;
import lombok.Builder;

@Builder
public record AuthorityResponse(UUID id, String name, String countryCode, AuthorityKind kind, Short slaDays) {}
