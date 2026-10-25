package com.equifreight.model.clearance;

import java.util.UUID;
import lombok.Builder;

/** A country we serve, with its regulation catalog, or a null {@code catalog} when it has none yet (US-F2-12). */
@Builder
public record RegulationCountryResponse(UUID id, String code, String name, RegulationCatalogResponse catalog) {}
