-- Online card payment (database-design.md, 13A): the customer pays an issued invoice on Stripe's hosted Checkout
-- page, and Stripe's webhook records the payment. A checkout is not a payment: it is the page the customer was sent
-- to, for the amount due when they opened it. The payment row is written only once Stripe confirms the money.

create type CardCheckoutStatus as enum ('OPEN', 'PAID', 'EXPIRED', 'REFUNDED');

create table public.card_checkouts
(
    id             uuid                     default uuidv7() not null primary key,
    invoice_id     uuid                                      not null
        constraint card_checkouts_invoice_id_fkey references public.invoices,
    -- Stripe's Checkout Session id (cs_...), the key every webhook event carries.
    session_id     varchar(100)                              not null
        constraint card_checkouts_session_id_key unique,
    url            text                                      not null,
    amount         numeric(14, 2)                            not null
        constraint card_checkouts_amount_check check (amount > 0),
    status         CardCheckoutStatus       default 'OPEN'   not null,
    expires_at     timestamp(6) with time zone               not null,
    started_by     uuid                                      not null
        constraint card_checkouts_started_by_fkey references public.users,
    -- Stripe's PaymentIntent id (pi_...), set once the customer has paid.
    payment_intent varchar(100),
    -- The payment it recorded, when paid; null when it expired or was refunded.
    payment_id     uuid
        constraint card_checkouts_payment_id_key unique
        constraint card_checkouts_payment_id_fkey references public.payments,
    -- Stripe's refund id (re_...), when the money was sent back because the invoice was no longer owed.
    refund_id      varchar(100),
    created_at     timestamp(6) with time zone default now() not null,
    updated_at     timestamp(6) with time zone               not null,
    constraint card_checkouts_outcome_check check (
        (status = 'OPEN' and payment_id is null and refund_id is null)
            or (status = 'PAID' and payment_id is not null and payment_intent is not null and refund_id is null)
            or (status = 'EXPIRED' and payment_id is null and refund_id is null)
            or (status = 'REFUNDED' and payment_id is null and payment_intent is not null and refund_id is not null))
);

-- At most one open checkout per invoice, so the customer can't pay the same amount twice from two tabs.
create unique index card_checkouts_one_open_idx on public.card_checkouts (invoice_id) where status = 'OPEN';

alter type NotificationKind add value 'CARD_PAYMENT_REFUNDED' after 'PAYMENT_RECORDED';
