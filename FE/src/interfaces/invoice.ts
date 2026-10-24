/** BE InvoiceKind: a deposit at acceptance, a final invoice after the handover (US-F6-03). */
export const InvoiceKindEnum = {
  DEPOSIT: 'DEPOSIT',
  FINAL: 'FINAL',
  CREDIT_NOTE: 'CREDIT_NOTE',
} as const;
export type InvoiceKind = (typeof InvoiceKindEnum)[keyof typeof InvoiceKindEnum];

export const InvoiceStatusEnum = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  VOID: 'VOID',
} as const;
export type InvoiceStatus = (typeof InvoiceStatusEnum)[keyof typeof InvoiceStatusEnum];

export const InvoiceLineKindEnum = {
  QUOTED: 'QUOTED',
  ACTUALISED: 'ACTUALISED',
  DEPOSIT: 'DEPOSIT',
  DEPOSIT_DEDUCTION: 'DEPOSIT_DEDUCTION',
  LATE_PENALTY_CREDIT: 'LATE_PENALTY_CREDIT',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;
export type InvoiceLineKind = (typeof InvoiceLineKindEnum)[keyof typeof InvoiceLineKindEnum];

export const PaymentMethodEnum = { BANK_TRANSFER: 'BANK_TRANSFER', CARD: 'CARD' } as const;
export type PaymentMethod = (typeof PaymentMethodEnum)[keyof typeof PaymentMethodEnum];

/** The Invoices list's tabs (BE InvoiceView). */
export type InvoiceView = 'ALL' | 'TO_BE_PAID' | 'OVERDUE' | 'PAID';

export interface InvoiceSummary {
  id: string;
  code: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  clubName: string | null;
  requestId: string;
  requestCode: string | null;
  jobCode: string | null;
  currency: string;
  total: number;
  amountDue: number;
  /** YYYY-MM-DD. */
  dueOn: string | null;
  overdue: boolean;
}

export interface InvoiceLine {
  id: string;
  position: number;
  kind: InvoiceLineKind;
  description: string;
  quantity: number | null;
  unitRate: number | null;
  amount: number;
  note: string | null;
  quotationLineId: string | null;
  quotedQuantity: number | null;
  quotedAmount: number | null;
  /** An estimated line whose actual quantity is set while the invoice is a draft. */
  actualisable: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  receivedAt: string;
  recordedByName: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'REFUNDED';
}

export interface Invoice {
  id: string;
  code: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  clubName: string;
  requestId: string;
  requestCode: string | null;
  jobId: string | null;
  jobCode: string | null;
  quotationCode: string;
  quotationVersion: number;
  quotationTotal: number;
  currency: string;
  issuedAt: string | null;
  issuedByName: string | null;
  dueOn: string | null;
  overdue: boolean;
  subtotal: number;
  taxPct: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  lines: InvoiceLine[];
  payments: Payment[];
}

/** A job whose handover is settled and has no final invoice yet. */
export interface ReadyForInvoice {
  jobId: string;
  jobCode: string;
  clubName: string;
  outcome: 'CONFIRMED_SOUND' | 'PROBLEM_REPORTED';
  acceptedByDefault: boolean;
  answeredAt: string | null;
}

export interface ActualQuantityInput {
  quantity: number;
  note?: string;
}

export interface RecordPaymentInput {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  /** YYYY-MM-DD. */
  receivedOn: string;
}
