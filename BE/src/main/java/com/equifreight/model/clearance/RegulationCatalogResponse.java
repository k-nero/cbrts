package com.equifreight.model.clearance;

import java.util.UUID;
import lombok.Builder;

@Builder
public record RegulationCatalogResponse(
        UUID id, String countryCode, String name, RegulationVersionResponse activeVersion) {}
