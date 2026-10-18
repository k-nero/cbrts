-- Domain F (§8): transport requests and their quotations.

create table transport_requests (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    code varchar(14) not null unique,
    club_id uuid not null references clubs (id),
    created_by uuid references users (id),
    status varchar(20) not null default 'DRAFT'
        constraint transport_requests_status_check check (status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW',
                                                                    'INFO_REQUIRED', 'QUOTED', 'CUSTOMER_ACCEPTED',
                                                                    'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
    mode varchar(10) constraint transport_requests_mode_check check (mode in ('ROAD', 'AIR')),
    trailer varchar(10) constraint transport_requests_trailer_check check (trailer in ('SHARED', 'PRIVATE')),
    air_class varchar(10)
        constraint transport_requests_air_class_check check (air_class in ('ECONOMY', 'BUSINESS', 'FIRST')),
    insurance varchar(20)
        constraint transport_requests_insurance_check check (insurance in ('OWN_POLICY', 'EQUIFREIGHT')),
    vet_escort boolean not null default false,
    origin_place_id uuid references places (id),
    destination_place_id uuid references places (id),
    corridor_id uuid references corridors (id),
    departure_date date not null,
    date_flex_days smallint not null default 0
        constraint transport_requests_date_flex_days_check check (date_flex_days in (0, 3)),
    arrival_mode varchar(10) not null default 'ANY_TIME'
        constraint transport_requests_arrival_mode_check check (arrival_mode in ('ANY_TIME', 'WINDOW')),
    window_start timestamptz,
    window_end timestamptz,
    special_instructions varchar(500),
    estimate_low numeric(14, 2),
    estimate_high numeric(14, 2),
    submitted_at timestamptz,
    lead_time_override_by uuid references users (id),
    lead_time_override_at timestamptz,
    lead_time_override_reason varchar(500),
    reject_reason varchar(500),
    info_required_note varchar(1000),
    cancelled_at timestamptz,
    cancellation_fee_pct numeric(5, 2),
    primary key (id),
    -- The arrival window: road, private trailer, fixed dates, at least 3 hours (ARRIVAL_WINDOW_MIN_HOURS).
    constraint transport_requests_arrival_window_check check (
        (arrival_mode = 'ANY_TIME' and window_start is null and window_end is null)
        or (arrival_mode = 'WINDOW' and mode = 'ROAD' and trailer = 'PRIVATE' and date_flex_days = 0
            and window_end - window_start >= interval '3 hours')),
    constraint transport_requests_mode_options_check check (
        (mode = 'ROAD' and air_class is null) or (mode = 'AIR' and trailer is null)),
    constraint transport_requests_reject_reason_check check (status <> 'REJECTED' or reject_reason is not null),
    constraint transport_requests_info_required_note_check
        check (status <> 'INFO_REQUIRED' or info_required_note is not null),
    constraint transport_requests_estimate_check check (estimate_low <= estimate_high)
);

create index transport_requests_club_id_idx on transport_requests (club_id);
create index transport_requests_status_idx on transport_requests (status);

create table request_horses (
    request_id uuid not null references transport_requests (id) on delete cascade,
    horse_id uuid not null references horses (id),
    -- Snapshot at the time of the request, so later edits to the horse don't change it.
    declared_value numeric(14, 2) not null,
    sex varchar(10) not null
        constraint request_horses_sex_check check (sex in ('STALLION', 'MARE', 'GELDING', 'COLT', 'FILLY')),
    size_class_code varchar(4) not null,
    required_stall varchar(20) not null
        constraint request_horses_required_stall_check check (required_stall in ('STANDARD', 'BOX', 'CLIMATE')),
    primary key (request_id, horse_id)
);

-- BR-F1-06: the horse list is locked once the request is approved.
create function request_horses_lock() returns trigger
    language plpgsql as
$$
begin
    if exists (select 1
               from transport_requests
               where id in (old.request_id, new.request_id)
                 and status = 'APPROVED') then
        raise exception 'The horses of an approved request are locked (BR-F1-06)' using errcode = 'check_violation';
    end if;
    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end
$$;

create trigger request_horses_lock before insert or update or delete on request_horses
    for each row execute function request_horses_lock();

create table request_revisions (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    request_id uuid not null references transport_requests (id) on delete cascade,
    revision_no smallint not null,
    payload jsonb not null,
    submitted_at timestamptz not null,
    note varchar(500),
    primary key (id),
    unique (request_id, revision_no)
);

create table quotations (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    code varchar(14) not null,
    request_id uuid not null references transport_requests (id),
    version_no smallint not null,
    status varchar(12) not null default 'DRAFT'
        constraint quotations_status_check check (status in ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'EXPIRED',
                                                            'SUPERSEDED')),
    rate_catalog_version_id uuid not null references rate_catalog_versions (id),
    currency char(3) not null,
    fx_rates jsonb,
    prepared_by uuid references users (id),
    issued_at timestamptz,
    valid_until timestamptz,
    subtotal numeric(14, 2),
    volume_break numeric(14, 2),
    fuel numeric(14, 2),
    insurance numeric(14, 2),
    contingency numeric(14, 2),
    service_fee numeric(14, 2),
    arrival_window_surcharge numeric(14, 2),
    total numeric(14, 2),
    deposit_pct numeric(5, 2),
    deposit_amount numeric(14, 2),
    late_penalty_pct_per_hour numeric(5, 2),
    late_penalty_cap_pct numeric(5, 2),
    accepted_at timestamptz,
    accepted_by uuid references users (id),
    declined_at timestamptz,
    decline_reason varchar(500),
    superseded_reason varchar(300),
    primary key (id),
    unique (request_id, version_no),
    -- An issued quotation is a document: its totals are stored.
    constraint quotations_issued_totals_check check (status = 'DRAFT' or (issued_at is not null and total is not null))
);

-- One accepted version per request.
create unique index quotations_request_id_accepted_idx on quotations (request_id) where status = 'ACCEPTED';
create index quotations_code_idx on quotations (code);

create table quotation_lines (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    quotation_id uuid not null references quotations (id) on delete cascade,
    group_code char(1) not null constraint quotation_lines_group_code_check check (group_code between 'A' and 'H'),
    position smallint not null,
    description varchar(160) not null,
    basis_text varchar(80),
    basis varchar(20) not null
        constraint quotation_lines_basis_check check (basis in ('PER_HORSE', 'PER_SHIPMENT', 'PER_KM', 'PER_DAY',
                                                              'PER_CROSSING', 'PER_HOUR', 'PER_POSITION')),
    quantity numeric(10, 2) not null,
    unit_rate numeric(14, 2),
    source varchar(10) not null constraint quotation_lines_source_check check (source in ('CATALOG', 'MANUAL')),
    rate_line_id uuid references rate_lines (id),
    horse_id uuid references horses (id),
    certainty varchar(12) not null default 'FIXED'
        constraint quotation_lines_certainty_check check (certainty in ('FIXED', 'ESTIMATED', 'OVERRIDDEN')),
    estimate_note varchar(300),
    catalog_amount numeric(14, 2),
    override_amount numeric(14, 2),
    override_reason varchar(300),
    -- Never entered. Null while the line has no rate and no override ("No rate", blocks issue).
    line_total numeric(14, 2) generated always as (coalesce(override_amount, catalog_amount)) stored,
    primary key (id),
    constraint quotation_lines_override_reason_check check (override_amount is null or override_reason is not null),
    constraint quotation_lines_rate_line_check check (source <> 'CATALOG' or rate_line_id is not null)
);

create index quotation_lines_quotation_id_idx on quotation_lines (quotation_id);
