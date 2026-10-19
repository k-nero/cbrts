package com.equifreight.model.rate;

import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** The Rates page's frame: the versions (newest first) and the corridors. */
@Builder
public record RateCatalogResponse(
        UUID currentVersionId,
        UUID draftVersionId,
        List<RateVersionResponse> versions,
        List<RateCorridorResponse> corridors) {}
