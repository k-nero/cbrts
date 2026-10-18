package com.equifreight.entity.enums;

/**
 * {@code invoices.status}. An issued invoice is never edited: it is voided and replaced, or corrected by a credit note.
 */
public enum InvoiceStatus {
    DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID
}
