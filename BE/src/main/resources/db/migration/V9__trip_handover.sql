-- Domain I (§11): the escort's trip log, horse condition checks and the handover.

-- Shared by every append-only table (legal evidence): no update, no delete.
create function forbid_update_delete() returns trigger
    language plpgsql as
$$
begin
    raise
exception '% is append-only: % is not allowed', tg_table_name, tg_op using errcode = 'check_violation';
end
$$;

create table trip_records
(
    id            uuid        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz,
    job_id        uuid        not null references transport_jobs (id),
    route_stop_id uuid references route_stops (id),
    kind          varchar(20) not null
        constraint trip_records_kind_check check (kind in ('LOADED', 'DEPARTED', 'ARRIVED_AT_STOP', 'CLEARED_BORDER',
                                                           'HELD', 'LEFT_STOP', 'CONDITION_CHECK',
                                                           'ACCEPTED_BY_AIRLINE', 'FLIGHT_DEPARTED', 'FLIGHT_LANDED',
                                                           'RELEASED_BY_AIRLINE', 'DELIVERED', 'HANDED_OVER', 'NOTE')),
    occurred_at   timestamptz not null,               -- the cab's clock
    received_at   timestamptz not null default now(), -- the server's clock
    client_ref    uuid unique,                        -- makes a re-sent record idempotent
    recorded_by   uuid references users (id),
    channel       varchar(12) not null
        constraint trip_records_channel_check check (channel in ('CAB_TABLET', 'WEB')),
    text          varchar(500),
    primary key (id)
);

create index trip_records_job_id_occurred_at_idx on trip_records (job_id, occurred_at);

create trigger trip_records_append_only
    before update or
delete
on trip_records
    for each row execute function forbid_update_delete();

-- BR-F2-03: nobody departs before the dossier is clearance-ready.
create function trip_records_clearance_gate() returns trigger
    language plpgsql as
$$
begin
    if
new.kind = 'DEPARTED' and not exists (select 1
                                             from transport_jobs
                                             where id = new.job_id
                                               and dossier_status = 'CLEARANCE_READY') then
        raise exception 'Job % is not clearance-ready; it cannot depart (BR-F2-03)', new.job_id
            using errcode = 'check_violation';
end if;
return new;
end
$$;

create trigger trip_records_clearance_gate
    before insert
    on trip_records
    for each row execute function trip_records_clearance_gate();

create table condition_logs
(
    id             uuid        not null,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz,
    trip_record_id uuid        not null references trip_records (id),
    horse_id       uuid        not null references horses (id),
    condition      varchar(10) not null
        constraint condition_logs_condition_check check (condition in ('SOUND', 'WATCH', 'CONCERN')),
    drinking       boolean,
    eating         boolean,
    note           varchar(500),
    primary key (id),
    unique (trip_record_id, horse_id)
);

create trigger condition_logs_append_only
    before update or
delete
on condition_logs
    for each row execute function forbid_update_delete();

create table handovers
(
    id               uuid        not null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz,
    job_id           uuid        not null unique references transport_jobs (id),
    delivered_at     timestamptz,
    receiving_name   varchar(120),
    confirm_due_at   timestamptz,
    customer_outcome varchar(20)
        constraint handovers_customer_outcome_check check (customer_outcome in ('CONFIRMED_SOUND', 'PROBLEM_REPORTED')),
    confirmed_by     uuid references users (id),
    confirmed_at     timestamptz,
    late_minutes     integer,
    penalty_amount   numeric(14, 2),
    primary key (id)
);
