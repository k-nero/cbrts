-- Quotation negotiation (Flow 1B, 23 Nov 2026): which lines a club may negotiate, and its counter-offers.

-- A third party's charge (vet, authority, isolation) is passed on at cost and can't be negotiated.
alter table rate_lines
    add column negotiable boolean default true not null;
alter table quotation_lines
    add column negotiable boolean default true not null;

update rate_lines
set negotiable = false
where code in ('VET_BLOODS', 'HEALTH_CERT', 'CROSSING', 'IMPORT_PERMIT', 'POST_ISO');

update quotation_lines ql
set negotiable = rl.negotiable
from rate_lines rl
where rl.id = ql.rate_line_id;

-- One counter-offer per issued version: what the club asked, and how the logistics manager answered.
create table public.quotation_counter_offers
(
    id                           uuid                     default uuidv7() not null primary key,
    quotation_id                 uuid                                      not null
        constraint quotation_counter_offers_quotation_id_key unique
        constraint quotation_counter_offers_quotation_id_fkey references public.quotations,
    request_id                   uuid                                      not null
        constraint quotation_counter_offers_request_id_fkey references public.transport_requests,
    created_by                   uuid                                      not null
        constraint quotation_counter_offers_created_by_fkey references public.users,
    message                      varchar(500),
    status                       varchar(12)                               not null
        constraint quotation_counter_offers_status_check check (status in ('OPEN', 'REVISED', 'BEST_PRICE', 'CLOSED')),
    answered_by                  uuid
        constraint quotation_counter_offers_answered_by_fkey references public.users,
    answered_at                  timestamp(6) with time zone,
    answer_message               varchar(500),
    answered_with_quotation_id   uuid
        constraint quotation_counter_offers_answered_with_fkey references public.quotations,
    created_at                   timestamp(6) with time zone default now() not null,
    updated_at                   timestamp(6) with time zone               not null,
    constraint quotation_counter_offers_answer_check check (
        (status = 'OPEN' and answered_at is null)
            or (status = 'REVISED' and answered_at is not null and answered_with_quotation_id is not null)
            or (status = 'BEST_PRICE' and answered_at is not null and answer_message is not null)
            or (status = 'CLOSED' and answered_at is not null))
);

create index quotation_counter_offers_request_id_idx on public.quotation_counter_offers (request_id);

create table public.quotation_counter_offer_lines
(
    id               uuid                     default uuidv7() not null primary key,
    counter_offer_id uuid                                      not null
        constraint quotation_counter_offer_lines_counter_offer_id_fkey
            references public.quotation_counter_offers on delete cascade,
    line_key         varchar(80)                               not null,
    description      varchar(160)                              not null,
    quoted_amount    numeric(14, 2)                            not null,
    asked_amount     numeric(14, 2)                            not null
        constraint quotation_counter_offer_lines_asked_amount_check check (asked_amount >= 0),
    reason           varchar(300)                              not null,
    created_at       timestamp(6) with time zone default now() not null,
    updated_at       timestamp(6) with time zone               not null,
    constraint quotation_counter_offer_lines_key_unique unique (counter_offer_id, line_key),
    constraint quotation_counter_offer_lines_below_check check (asked_amount < quoted_amount)
);

alter type NotificationKind add value 'QUOTATION_COUNTER_OFFER' after 'QUOTATION_REQUOTE_ASKED';
alter type NotificationKind add value 'QUOTATION_BEST_PRICE' after 'QUOTATION_COUNTER_OFFER';
