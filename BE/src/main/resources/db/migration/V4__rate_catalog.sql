-- Domain D (§6): the versioned rate catalog. A published version is immutable.

create table rate_catalog_versions (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    version_no integer not null unique,
    status varchar(12) not null default 'DRAFT'
        constraint rate_catalog_versions_status_check check (status in ('DRAFT', 'PUBLISHED', 'RETIRED')),
    published_at timestamptz,
    published_by uuid references users (id),
    change_note varchar(500),
    primary key (id)
);

-- At most one draft at a time.
create unique index rate_catalog_versions_draft_idx on rate_catalog_versions (status) where status = 'DRAFT';

create table rate_service_classes (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    version_id uuid not null references rate_catalog_versions (id) on delete cascade,
    corridor_id uuid not null references corridors (id),
    service_class varchar(10) not null
        constraint rate_service_classes_service_class_check check (service_class in ('ECONOMY', 'BUSINESS', 'FIRST')),
    width_per_horse_in smallint not null,
    horses_per_position smallint not null,
    position_rate numeric(14, 2) not null,
    primary key (id),
    unique (version_id, corridor_id, service_class)
);

create table rate_lines (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    version_id uuid not null references rate_catalog_versions (id) on delete cascade,
    corridor_id uuid references corridors (id),
    code varchar(40) not null,
    group_code char(1) not null constraint rate_lines_group_code_check check (group_code between 'A' and 'H'),
    description varchar(160) not null,
    basis varchar(20) not null
        constraint rate_lines_basis_check check (basis in ('PER_HORSE', 'PER_SHIPMENT', 'PER_KM', 'PER_DAY',
                                                         'PER_CROSSING', 'PER_HOUR', 'PER_POSITION')),
    applies_to_sex varchar(10)
        constraint rate_lines_applies_to_sex_check check (applies_to_sex in ('STALLION', 'MARE', 'GELDING', 'COLT', 'FILLY')),
    rate numeric(14, 2) not null,
    min_charge numeric(14, 2),
    certainty varchar(10) not null default 'FIXED'
        constraint rate_lines_certainty_check check (certainty in ('FIXED', 'ESTIMATED')),
    primary key (id)
);

-- corridor_id null means "every corridor", so nulls must collide.
create unique index rate_lines_version_id_corridor_id_code_idx
    on rate_lines (version_id, corridor_id, code) nulls not distinct;

create table rate_volume_breaks (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    version_id uuid not null references rate_catalog_versions (id) on delete cascade,
    corridor_id uuid references corridors (id),
    min_horses smallint not null,
    max_horses smallint,
    discount_pct numeric(5, 2) not null,
    primary key (id),
    constraint rate_volume_breaks_band_check check (min_horses <= coalesce(max_horses, min_horses))
);

create table rate_policies (
    version_id uuid not null references rate_catalog_versions (id) on delete cascade,
    key varchar(40) not null
        constraint rate_policies_key_check check (key in ('FUEL_PCT', 'INSURANCE_PCT', 'CONTINGENCY_PCT',
                                                         'SERVICE_FEE_PCT', 'DEPOSIT_PCT', 'QUOTE_VALIDITY_DAYS',
                                                         'FLIGHT_VET_MIN_HORSES', 'HIGH_VALUE_THRESHOLD',
                                                         'ARRIVAL_WINDOW_PCT', 'ARRIVAL_WINDOW_MIN_HOURS',
                                                         'LATE_PENALTY_PCT_PER_HOUR', 'LATE_PENALTY_CAP_PCT')),
    value numeric(14, 3) not null,
    primary key (version_id, key)
);

create table rate_fee_bands (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    version_id uuid not null references rate_catalog_versions (id) on delete cascade,
    kind varchar(20) not null
        constraint rate_fee_bands_kind_check check (kind in ('CANCELLATION', 'SHORT_NOTICE')),
    min_days smallint not null,
    max_days smallint,
    value numeric(6, 3) not null,
    primary key (id),
    constraint rate_fee_bands_band_check check (min_days <= coalesce(max_days, min_days))
);

-- Shared by both versioned catalogs: a child row of a non-draft version can't be written.
-- tg_argv[0] is the version table; every child names its parent in version_id.
create function catalog_child_guard() returns trigger
    language plpgsql as
$$
declare
    v_status varchar;
begin
    if tg_op <> 'INSERT' then
        execute format('select status from %I where id = $1', tg_argv[0]) into v_status using old.version_id;
        if v_status <> 'DRAFT' then
            raise exception '%: % belongs to a % catalog version, which is immutable', tg_op, tg_table_name, v_status
                using errcode = 'check_violation';
        end if;
    end if;
    if tg_op <> 'DELETE' then
        execute format('select status from %I where id = $1', tg_argv[0]) into v_status using new.version_id;
        if v_status <> 'DRAFT' then
            raise exception '%: % belongs to a % catalog version, which is immutable', tg_op, tg_table_name, v_status
                using errcode = 'check_violation';
        end if;
        return new;
    end if;
    return old;
end
$$;

create trigger rate_service_classes_guard before insert or update or delete on rate_service_classes
    for each row execute function catalog_child_guard('rate_catalog_versions');
create trigger rate_lines_guard before insert or update or delete on rate_lines
    for each row execute function catalog_child_guard('rate_catalog_versions');
create trigger rate_volume_breaks_guard before insert or update or delete on rate_volume_breaks
    for each row execute function catalog_child_guard('rate_catalog_versions');
create trigger rate_policies_guard before insert or update or delete on rate_policies
    for each row execute function catalog_child_guard('rate_catalog_versions');
create trigger rate_fee_bands_guard before insert or update or delete on rate_fee_bands
    for each row execute function catalog_child_guard('rate_catalog_versions');
