package com.equifreight.model.clearance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Moves a job onto a newer published version of one of its catalogs; the reason goes to the audit log. */
public record CatalogMoveRequest(
        @NotNull(message = "Pick the version to move to.") UUID versionId,

        @NotBlank(message = "Say why the job moves to the new version.")
        @Size(max = 500, message = "The reason is at most 500 characters.")
        String reason) {}
