package com.equifreight.model.home;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

/**
 * One thing the club owes: a document, an answer to a quotation, or an answer to the manager's note.
 * {@code kind} ({@code DOCUMENT}, {@code QUOTATION}, {@code ANSWER}) tells the page where the action opens.
 */
@Builder
public record OwedEntryResponse(
        String id,
        String kind,
        UUID requestId,
        /* The checklist item, for a document; else null. */
        UUID itemId,
        /* {@code overdue}, {@code soon} or {@code upcoming}. */
        String urgency,
        String title,
        /* "CBRT-2026-041 · Silver Bell · Bill of sale". */
        String subject,
        /* The rule, or who asked and why. */
        String reason,
        /* Null while the job has no planned departure to count from. */
        Instant dueAt,
        String actionLabel,
        /* {@code upload} for an upload; else null. */
        String actionIcon) {}
