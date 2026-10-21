package com.equifreight.model.rate;

import lombok.Builder;

/** Publishing the draft: what changed in this version, shown in the Versions panel and the audit log. */
@Builder
public record PublishRequest(String changeNote) {}
