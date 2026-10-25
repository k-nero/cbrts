package com.equifreight.model.clearance;

import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** One country's regulation catalog: its published version, its draft, and every version newest first. */
@Builder
public record RegulationCatalogResponse(
        UUID id,
        String countryCode,
        String name,
        RegulationVersionResponse activeVersion,
        RegulationVersionResponse draftVersion,
        List<RegulationVersionResponse> versions) {}
