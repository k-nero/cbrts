-- Domain L (§14): the append-only audit log (BR-F1-08) and the human-code counters.

create table audit_log (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    occurred_at timestamptz not null default now(),
    actor_id uuid references users (id),
    actor_label varchar(160) not null,
    actor_role varchar(30),
    channel varchar(12) not null constraint audit_log_channel_check check (channel in ('WEB', 'CAB_TABLET', 'SYSTEM')),
    device_recorded_at timestamptz,
    action varchar(60) not null,
    summary varchar(500) not null,
    entity_type varchar(40),
    entity_id uuid,
    entity_code varchar(20),
    before jsonb,
    after jsonb,
    reason varchar(500),
    primary key (id)
);

create index audit_log_occurred_at_idx on audit_log (occurred_at desc);
create index audit_log_entity_code_occurred_at_idx on audit_log (entity_code, occurred_at desc);
create index audit_log_actor_id_occurred_at_idx on audit_log (actor_id, occurred_at desc);
create index audit_log_action_idx on audit_log (action);

create trigger audit_log_append_only before update or delete on audit_log
    for each row execute function forbid_update_delete();

-- The next code is issued with select ... for update inside the creating transaction.
create table code_counters (
    prefix varchar(4) not null constraint code_counters_prefix_check check (prefix in ('REQ', 'Q', 'CBRT', 'EF', 'INV')),
    year smallint not null,
    last_value integer not null default 0,
    primary key (prefix, year)
);
