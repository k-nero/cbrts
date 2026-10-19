package com.equifreight.model.quotation;

import java.util.UUID;
import lombok.Builder;

/** The rate catalog version a quotation is pinned to. */
@Builder
public record PinnedVersionResponse(UUID id, int versionNo) {}
