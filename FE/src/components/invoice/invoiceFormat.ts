import type { Tone } from '@/components/ui';
import type { InvoiceKind, InvoiceLineKind, InvoiceStatus, PaymentMethod } from '@/interfaces';

/** An invoice's state as a tone plus a word; an overdue one reads Overdue in the bad tone. */
export const invoiceStatus = (
  status: InvoiceStatus,
  overdue = false,
): { tone: Tone; label: string } =>
  overdue
    ? { tone: 'bad', label: 'Overdue' }
    : (
        {
          DRAFT: { tone: 'neutral', label: 'Draft' },
          ISSUED: { tone: 'warn', label: 'Due' },
          PARTIALLY_PAID: { tone: 'warn', label: 'Part paid' },
          PAID: { tone: 'ok', label: 'Paid' },
          VOID: { tone: 'neutral', label: 'Void' },
        } as const
      )[status];

export const INVOICE_KIND: Record<InvoiceKind, string> = {
  DEPOSIT: 'Deposit',
  FINAL: 'Final',
  CREDIT_NOTE: 'Credit note',
};

/** Each line says where it comes from (DESIGN.md, Invoice): as quoted, actual, a charge, a credit. */
export const LINE_TAG: Record<InvoiceLineKind, { tone: Tone; label: string }> = {
  QUOTED: { tone: 'neutral', label: 'As quoted' },
  ACTUALISED: { tone: 'info', label: 'Actual' },
  DEPOSIT: { tone: 'neutral', label: 'Deposit' },
  DEPOSIT_DEDUCTION: { tone: 'neutral', label: 'Deposit' },
  LATE_PENALTY_CREDIT: { tone: 'ok', label: 'Credit' },
  ADJUSTMENT: { tone: 'warn', label: 'Incident' },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'Bank transfer',
  CARD: 'Card',
};

/** "1.5" not "1.50": a quantity as it was counted. */
export const qty = (n: number | null) => (n == null ? '' : String(Number(n)));
