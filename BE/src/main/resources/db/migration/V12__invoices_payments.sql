-- Domain M (§13A): deposit and final invoices, settled against the accepted quotation; payments recorded by hand.

create table invoices
(
    id                  uuid           not null,
    created_at          timestamptz    not null default now(),
    updated_at          timestamptz,
    code                varchar(16)    not null unique,
    kind                varchar(12)    not null
        constraint invoices_kind_check check (kind in ('DEPOSIT', 'FINAL', 'CREDIT_NOTE')),
    quotation_id        uuid           not null references quotations (id),
    job_id              uuid references transport_jobs (id), -- null for the deposit invoice
    club_id             uuid           not null references clubs (id),
    status              varchar(16)    not null default 'DRAFT'
        constraint invoices_status_check check (status in ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID')),
    issued_by           uuid references users (id),
    issued_at           timestamptz,
    due_on              date,
    subtotal            numeric(14, 2) not null default 0,
    tax_pct             numeric(5, 2)  not null default 0,
    tax_amount          numeric(14, 2) not null default 0,
    total               numeric(14, 2) not null default 0,
    amount_paid         numeric(14, 2) not null default 0,
    voided_at           timestamptz,
    void_reason         varchar(500),
    corrects_invoice_id uuid references invoices (id),
    primary key (id),
    constraint invoices_void_check check (status <> 'VOID' or (voided_at is not null and void_reason is not null)),
    constraint invoices_credit_note_check check ((kind = 'CREDIT_NOTE') = (corrects_invoice_id is not null)),
    constraint invoices_final_job_check check (kind <> 'FINAL' or job_id is not null)
);

-- One live deposit and one live final invoice per quotation.
create unique index invoices_quotation_id_deposit_idx on invoices (quotation_id) where kind = 'DEPOSIT' and status <> 'VOID';
create unique index invoices_quotation_id_final_idx on invoices (quotation_id) where kind = 'FINAL' and status <> 'VOID';
create index invoices_club_id_idx on invoices (club_id);

create table invoice_lines
(
    id                uuid           not null,
    created_at        timestamptz    not null default now(),
    updated_at        timestamptz,
    invoice_id        uuid           not null references invoices (id) on delete cascade,
    position          smallint       not null,
    quotation_line_id uuid references quotation_lines (id),
    kind              varchar(20)    not null
        constraint invoice_lines_kind_check check (kind in ('QUOTED', 'ACTUALISED', 'DEPOSIT', 'DEPOSIT_DEDUCTION',
                                                            'LATE_PENALTY_CREDIT', 'ADJUSTMENT')),
    description       varchar(160)   not null,
    quantity          numeric(10, 2),
    unit_rate         numeric(14, 2),
    amount            numeric(14, 2) not null, -- negative for credits and deductions
    note              varchar(300),
    primary key (id),
    unique (invoice_id, position),
    constraint invoice_lines_note_check check (kind not in ('ACTUALISED', 'ADJUSTMENT') or note is not null)
);

create table payments
(
    id          uuid           not null,
    created_at  timestamptz    not null default now(),
    updated_at  timestamptz,
    invoice_id  uuid           not null references invoices (id),
    amount      numeric(14, 2) not null
        constraint payments_amount_check check (amount > 0),
    method      varchar(20)    not null
        constraint payments_method_check check (method in ('BANK_TRANSFER', 'CARD')),
    reference   varchar(100),
    received_at timestamptz    not null,
    recorded_by uuid references users (id),
    status      varchar(12)    not null default 'PENDING'
        constraint payments_status_check check (status in ('PENDING', 'CONFIRMED', 'REFUNDED')),
    primary key (id)
);

create index payments_invoice_id_idx on payments (invoice_id);
