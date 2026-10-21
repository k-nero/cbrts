package com.equifreight.model.quotation;

import jakarta.validation.constraints.Size;

/** Issuing a version: from version 2 on, what changed since the one it replaces (its superseded reason). */
public record IssueRequest(@Size(max = 300) String changeNote) {}
