package com.equifreight.entity.enums;

/**
 * {@code invoice_lines.kind}.
 */
public enum InvoiceLineKind {
    QUOTED,
    ACTUALISED,
    DEPOSIT,
    DEPOSIT_DEDUCTION,
    LATE_PENALTY_CREDIT,
    /** What EquiFreight gives back for an incident (US-F5-07). */
    COMPENSATION_CREDIT,
    ADJUSTMENT
}
