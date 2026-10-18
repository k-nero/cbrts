-- Domain J (§12): incidents, the options weighed and the photos attached.

create table incidents
(
    id                  uuid         not null,
    created_at          timestamptz  not null default now(),
    updated_at          timestamptz,
    job_id              uuid         not null references transport_jobs (id),
    kind                varchar(20)  not null
        constraint incidents_kind_check check (kind in ('HELD', 'CUSTOMER_REPORT', 'WELFARE', 'VEHICLE')),
    source              varchar(12)  not null
        constraint incidents_source_check check (source in ('CAB', 'CUSTOMER', 'STAFF')),
    trip_record_id      uuid references trip_records (id),
    owner_id            uuid         not null references users (id),
    status              varchar(12)  not null default 'OPEN'
        constraint incidents_status_check check (status in ('OPEN', 'DECIDED', 'RESOLVED')),
    summary             varchar(500) not null,
    opened_at           timestamptz  not null default now(),
    reply_due_at        timestamptz,
    stops_clock         boolean      not null default false,
    clock_stopped_from  timestamptz,
    clock_stopped_until timestamptz,
    decided_option_id   uuid, -- FK added below, after incident_options
    decided_by          uuid references users (id),
    decided_at          timestamptz,
    decision_note       varchar(1000),
    resolved_at         timestamptz,
    primary key (id),
    constraint incidents_clock_check check (clock_stopped_until is null or clock_stopped_from < clock_stopped_until)
);

create index incidents_job_id_idx on incidents (job_id);

create table incident_options
(
    id          uuid         not null,
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz,
    incident_id uuid         not null references incidents (id) on delete cascade,
    title       varchar(160) not null,
    description varchar(1000),
    facts       jsonb,
    position    smallint     not null,
    primary key (id),
    unique (incident_id, position)
);

alter table incidents
    add constraint incidents_decided_option_id_fkey foreign key (decided_option_id) references incident_options (id);

create table incident_files
(
    incident_id uuid not null references incidents (id) on delete cascade,
    file_id     uuid not null references files (id),
    primary key (incident_id, file_id)
);
