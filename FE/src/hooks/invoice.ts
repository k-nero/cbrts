import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invoiceApi, invoicesListApi } from '@/apis/invoice';
import { useCrudResource } from '@/hooks/crud';
import type {
  ActualQuantityInput,
  Invoice,
  InvoiceSummary,
  InvoiceView,
  RecordPaymentInput,
} from '@/interfaces';

export const useInvoiceList = (view: InvoiceView) => {
  const extra = useMemo(() => ({ view }), [view]);
  return useCrudResource<InvoiceSummary, never>('invoices', invoicesListApi, undefined, extra);
};

export const useReadyForInvoice = () =>
  useQuery({ queryKey: ['invoices', 'ready'], queryFn: invoiceApi.ready });

/** Request review's Invoices panel; under `invoices`, so issuing or a payment refreshes it. */
export const useStaffRequestInvoices = (requestId: string | undefined) =>
  useQuery({
    queryKey: ['invoices', 'request', requestId],
    queryFn: () => invoiceApi.ofRequestForStaff(requestId as string),
    enabled: Boolean(requestId),
  });

export const useInvoice = (id: string) =>
  useQuery({ queryKey: ['invoice', id], queryFn: () => invoiceApi.get(id), enabled: Boolean(id) });

export const usePrepareFinalInvoice = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => invoiceApi.prepareFinal(jobId),
    onSuccess: async (invoice) => {
      client.setQueryData(['invoice', invoice.id], invoice);
      await client.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

/** An invoice change: the page shows the invoice the server returns, and the list refetches. */
const useInvoiceChange = <V>(id: string, change: (v: V) => Promise<Invoice>) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: change,
    onSuccess: async (invoice) => {
      client.setQueryData(['invoice', id], invoice);
      await client.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useSetInvoiceActual = (id: string) =>
  useInvoiceChange(id, (v: { lineId: string; input: ActualQuantityInput }) =>
    invoiceApi.setActual(id, v.lineId, v.input),
  );

export const useIssueInvoice = (id: string) => useInvoiceChange(id, () => invoiceApi.issue(id));

export const useRecordPayment = (id: string) =>
  useInvoiceChange(id, (input: RecordPaymentInput) => invoiceApi.recordPayment(id, input));

/** The customer's side. */
export const useRequestInvoices = (requestId: string) =>
  useQuery({
    queryKey: ['customer-invoices', requestId],
    queryFn: () => invoiceApi.ofRequest(requestId),
    enabled: Boolean(requestId),
  });

export const useCustomerInvoice = (id: string) =>
  useQuery({
    queryKey: ['customer-invoice', id],
    queryFn: () => invoiceApi.customerGet(id),
    enabled: Boolean(id),
  });
