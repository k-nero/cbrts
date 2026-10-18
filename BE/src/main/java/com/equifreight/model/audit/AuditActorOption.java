package com.equifreight.model.audit;

import java.util.UUID;
import lombok.Builder;

/**
 * A person who has entries in the audit log, for the Person filter.
 */
@Builder
public record AuditActorOption(UUID id, String label, String role) {}
