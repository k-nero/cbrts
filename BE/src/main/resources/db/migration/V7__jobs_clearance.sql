-- Domain G (§9): transport jobs, the clearance checklist, document versions and authority filings.

create table files
(
    id           uuid         not null,
    created_at   timestamptz  not null default now(),
    updated_at   timestamptz,
    storage_key  varchar(300) not null unique,
    file_name    varchar(255) not null,
    content_type varchar(100) not null,
    size_bytes   bigint       not null,
    sha256       char(64)     not null,
    uploaded_by  uuid references users (id),
    primary key (id)
);

-- Used by the role triggers below: tg_argv[0] is the column holding a user id, tg_argv[1] the role that user needs.
create function require_role() returns trigger
    language plpgsql as
$$
declare
v_user uuid;
begin
execute format('select ($1).%I', tg_argv[0]) into v_user using new;
if
v_user is not null and not exists (select 1
                                          from user_roles ur
                                                   join roles r on r.id = ur.role_id
                                          where ur.user_id = v_user
                                            and r.name = tg_argv[1]) then
        raise exception '%.% must be a % user', tg_table_name, tg_argv[0], tg_argv[1]
            using errcode = 'check_violation';
end if;
return new;
end
$$;

create table transport_jobs
(
    id                   uuid        not null,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz,
    code                 varchar(14) not null unique,
    request_id           uuid        not null unique references transport_requests (id),
    quotation_id         uuid        not null references quotations (id),
    approved_by          uuid        not null references users (id),
    approved_at          timestamptz not null,
    stage                varchar(12) not null default 'DOCUMENTS'
        constraint transport_jobs_stage_check check (stage in ('DOCUMENTS', 'CLEARANCE', 'TRIP', 'HANDOVER', 'CLOSED')),
    dossier_status       varchar(30) not null default 'OPEN'
        constraint transport_jobs_dossier_status_check check (dossier_status in ('OPEN', 'SUBMITTED_TO_AUTHORITY',
                                                                                 'ADDITIONAL_INFO_REQUIRED',
                                                                                 'CLEARANCE_READY')),
    clearance_ready_at   timestamptz,
    trip_status          varchar(12) not null default 'NOT_STARTED'
        constraint transport_jobs_trip_status_check check (trip_status in ('NOT_STARTED', 'DEPARTED', 'HELD',
                                                                           'ARRIVED', 'DELIVERED')),
    planned_departure_at timestamptz,
    planned_arrival_at   timestamptz,
    window_start         timestamptz,
    window_end           timestamptz,
    departed_at          timestamptz,
    delivered_at         timestamptz,
    closed_at            timestamptz,
    primary key (id),
    -- BR-F2-03, the clearance gate.
    constraint transport_jobs_clearance_gate_check check (
        departed_at is null or (dossier_status = 'CLEARANCE_READY' and clearance_ready_at <= departed_at)),
    constraint transport_jobs_window_check check (window_end is null or window_start < window_end)
);

-- BR-F1-04: only the logistics manager approves.
create trigger transport_jobs_approved_by_role
    before insert or
update of approved_by
on transport_jobs
    for each row execute function require_role('approved_by', 'LOGISTICS_MANAGER');

create table job_regulation_pins
(
    job_id                uuid        not null references transport_jobs (id) on delete cascade,
    regulation_version_id uuid        not null references regulation_versions (id),
    role                  varchar(12) not null
        constraint job_regulation_pins_role_check check (role in ('ORIGIN', 'TRANSIT', 'DESTINATION')),
    primary key (job_id, regulation_version_id)
);

create table checklist_items
(
    id                 uuid        not null,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz,
    job_id             uuid        not null references transport_jobs (id) on delete cascade,
    document_type_id   uuid        not null references document_types (id),
    regulation_rule_id uuid references regulation_rules (id),
    horse_id           uuid references horses (id),
    border_crossing_id uuid references border_crossings (id),
    status             varchar(20) not null default 'NOT_ISSUED'
        constraint checklist_items_status_check check (status in ('NOT_ISSUED', 'AWAITING_UPLOAD', 'IN_REVIEW',
                                                                  'CLEARED', 'REJECTED', 'WITH_AUTHORITY')),
    validity           varchar(5)
        constraint checklist_items_validity_check check (validity in ('GREEN', 'AMBER', 'RED')),
    validity_note      varchar(300),
    evaluated_at       timestamptz,
    holder             varchar(12)
        constraint checklist_items_holder_check check (holder in ('CUSTOMER', 'SPECIALIST', 'AUTHORITY')),
    due_date           date,
    current_version_id uuid, -- FK added below, after document_versions
    primary key (id)
);

create unique index checklist_items_job_document_horse_crossing_idx
    on checklist_items (job_id, document_type_id, horse_id, border_crossing_id) nulls not distinct;

create table document_versions
(
    id                uuid        not null,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz,
    checklist_item_id uuid        not null references checklist_items (id),
    version_no        smallint    not null,
    file_id           uuid        not null references files (id),
    issued_on         date,
    sampled_on        date,
    valid_until       date,
    issuer            varchar(120),
    uploaded_by       uuid        not null references users (id),
    uploaded_at       timestamptz not null default now(),
    review            varchar(10) not null default 'PENDING'
        constraint document_versions_review_check check (review in ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by       uuid references users (id),
    reviewed_at       timestamptz,
    reject_reason     varchar(500),
    primary key (id),
    unique (checklist_item_id, version_no),
    -- BR-F2-07: a rejection always carries a reason the customer can read.
    constraint document_versions_reject_reason_check check (review <> 'REJECTED' or reject_reason is not null),
    constraint document_versions_reviewed_check check (review = 'PENDING' or (reviewed_by is not null and reviewed_at is not null))
);

alter table checklist_items
    add constraint checklist_items_current_version_id_fkey
        foreign key (current_version_id) references document_versions (id);

-- BR-F2-05: versions are never overwritten. The only change allowed is the one review decision on a pending version.
create function document_versions_append_only() returns trigger
    language plpgsql as
$$
begin
    if
tg_op = 'DELETE' then
        raise exception 'document_versions is append-only (BR-F2-05)' using errcode = 'check_violation';
end if;
    if
old.review <> 'PENDING'
        or (old.id, old.checklist_item_id, old.version_no, old.file_id, old.issued_on, old.sampled_on,
            old.valid_until, old.issuer, old.uploaded_by, old.uploaded_at, old.created_at)
           is distinct from
           (new.id, new.checklist_item_id, new.version_no, new.file_id, new.issued_on, new.sampled_on,
            new.valid_until, new.issuer, new.uploaded_by, new.uploaded_at, new.created_at) then
        raise exception 'document_versions is append-only: only a pending version''s review can change (BR-F2-05)'
            using errcode = 'check_violation';
end if;
return new;
end
$$;

create trigger document_versions_append_only
    before update or
delete
on document_versions
    for each row execute function document_versions_append_only();

-- BR-F2-04: only the transport specialist reviews.
create trigger document_versions_reviewed_by_role
    before insert or
update of reviewed_by
on document_versions
    for each row execute function require_role('reviewed_by', 'TRANSPORT_SPECIALIST');

create table authorities
(
    id           uuid         not null,
    created_at   timestamptz  not null default now(),
    updated_at   timestamptz,
    name         varchar(160) not null,
    country_code char(2)      not null references countries (code),
    kind         varchar(12)  not null
        constraint authorities_kind_check check (kind in ('VETERINARY', 'CUSTOMS', 'QUARANTINE')),
    sla_days     smallint,
    primary key (id)
);

create table authority_submissions
(
    id             uuid        not null,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz,
    job_id         uuid        not null references transport_jobs (id) on delete cascade,
    authority_id   uuid        not null references authorities (id),
    kind           varchar(30) not null
        constraint authority_submissions_kind_check check (kind in ('EXPORT_HEALTH_CERTS', 'IMPORT_PERMIT',
                                                                    'CUSTOMS_DOSSIER')),
    status         varchar(20) not null default 'READY_TO_FILE'
        constraint authority_submissions_status_check check (status in ('READY_TO_FILE', 'FILED', 'ADDITIONAL_INFO',
                                                                        'ISSUED', 'REFUSED')),
    filed_at       timestamptz,
    filed_by       uuid references users (id),
    reference_no   varchar(60),
    expected_by    date,
    issued_at      timestamptz,
    result_file_id uuid references files (id),
    primary key (id)
);

create table authority_submission_items
(
    submission_id     uuid not null references authority_submissions (id) on delete cascade,
    checklist_item_id uuid not null references checklist_items (id),
    primary key (submission_id, checklist_item_id)
);

create table quarantine_periods
(
    id           uuid        not null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz,
    job_id       uuid        not null references transport_jobs (id) on delete cascade,
    horse_id     uuid references horses (id), -- null = the whole load
    place_id     uuid        not null references places (id),
    starts_on    date        not null,
    ends_on      date        not null,
    completed_at timestamptz,
    primary key (id),
    constraint quarantine_periods_dates_check check (starts_on <= ends_on)
);
