package com.equifreight.model.audit;

import java.util.UUID;

/** A person who has entries in the audit log, for the Person filter. */
public record AuditActorOption(UUID id, String label, String role) {}
