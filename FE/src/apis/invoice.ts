import client from '@/config/axios';

import { makeCrudApi } from './crudFactory';
import type {
  ActualQuantityInput,
  Invoice,
  InvoiceSummary,
  ReadyForInvoice,
  RecordPaymentInput,
} from '@/interfaces';

/** The Invoices list (US-F6-03); `view` picks the tab. */
export const invoicesListApi = makeCrudApi<InvoiceSummary, never>('/staff/invoices');

export const invoiceApi = {
  get: (id: string) => client.get<Invoice>(`/staff/invoices/${id}`).then((r) => r.data),

  /** Jobs whose handover is settled and that have no final invoice yet. */
  ready: () => client.get<ReadyForInvoice[]>('/staff/invoices/ready').then((r) => r.data),

  /** The job's final invoice as a draft. */
  prepareFinal: (jobId: string) =>
    client.post<Invoice>(`/staff/jobs/${jobId}/final-invoice`).then((r) => r.data),

  setActual: (id: string, lineId: string, input: ActualQuantityInput) =>
    client.put<Invoice>(`/staff/invoices/${id}/lines/${lineId}/actual`, input).then((r) => r.data),

  issue: (id: string) => client.post<Invoice>(`/staff/invoices/${id}/issue`).then((r) => r.data),

  recordPayment: (id: string, input: RecordPaymentInput) =>
    client.post<Invoice>(`/staff/invoices/${id}/payments`, input).then((r) => r.data),

  /** A request's invoices on Request review: the deposit, then its job's, drafts included. */
  ofRequestForStaff: (requestId: string) =>
    client.get<InvoiceSummary[]>(`/staff/requests/${requestId}/invoices`).then((r) => r.data),

  /** The customer's side: a request's invoices, and one invoice. */
  ofRequest: (requestId: string) =>
    client.get<InvoiceSummary[]>(`/customer/requests/${requestId}/invoices`).then((r) => r.data),

  customerGet: (id: string) => client.get<Invoice>(`/customer/invoices/${id}`).then((r) => r.data),
};
