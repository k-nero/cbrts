-- US-F6-03: a deposit invoice when the customer accepts the quotation, a final invoice after the handover settling
-- the estimated lines and approved incident costs against the accepted quotation, and payments recorded by hand.
alter type NotificationKind add value 'INVOICE_ISSUED' after 'HANDOVER_ACCEPTED';
alter type NotificationKind add value 'PAYMENT_RECORDED' after 'INVOICE_ISSUED';
alter type NotificationSubject add value 'INVOICE' after 'INCIDENT';

create index invoices_job_id_idx on public.invoices (job_id);
