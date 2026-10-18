-- Domain E (§7): the regulation catalog, one per country, versioned like the rate catalog.

create table regulation_catalogs
(
    id           uuid         not null,
    created_at   timestamptz  not null default now(),
    updated_at   timestamptz,
    country_code char(2)      not null unique references countries (code),
    name         varchar(120) not null,
    primary key (id)
);

create table regulation_versions
(
    id                  uuid        not null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz,
    catalog_id          uuid        not null references regulation_catalogs (id),
    version_no          integer     not null,
    status              varchar(12) not null default 'DRAFT'
        constraint regulation_versions_status_check check (status in ('DRAFT', 'PUBLISHED', 'RETIRED')),
    published_at        timestamptz,
    published_by        uuid references users (id),
    lead_time_days      smallint    not null,
    quarantine_min_days smallint    not null,
    arrival_buffer_days smallint    not null,
    primary key (id),
    unique (catalog_id, version_no)
);

-- At most one draft per country.
create unique index regulation_versions_draft_idx on regulation_versions (catalog_id) where status = 'DRAFT';

create table document_types
(
    id          uuid         not null,
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz,
    code        varchar(40)  not null unique,
    name        varchar(120) not null,
    scope       varchar(20)  not null
        constraint document_types_scope_check check (scope in ('PER_HORSE', 'PER_SHIPMENT', 'PER_CROSSING')),
    provided_by varchar(20)  not null
        constraint document_types_provided_by_check check (provided_by in ('CUSTOMER', 'AUTHORITY')),
    primary key (id)
);

create table regulation_rules
(
    id               uuid        not null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz,
    version_id       uuid        not null references regulation_versions (id) on delete cascade,
    document_type_id uuid        not null references document_types (id),
    mandatory        boolean     not null default true,
    rule_kind        varchar(30) not null
        constraint regulation_rules_rule_kind_check check (rule_kind in ('WINDOW_BEFORE_DEPARTURE',
                                                                         'VALID_THROUGH_ARRIVAL_PLUS',
                                                                         'BOOSTER_WINDOW', 'PRESENCE_ONLY')),
    min_days         smallint,
    max_days         smallint,
    description      varchar(500),
    primary key (id),
    unique (version_id, document_type_id)
);

create trigger regulation_rules_guard
    before insert or
update or
delete
on regulation_rules
    for each row execute function catalog_child_guard('regulation_versions');

-- Reference rows.
insert into document_types (id, code, name, scope, provided_by)
values (gen_random_uuid(), 'EQUINE_PASSPORT', 'Equine passport', 'PER_HORSE', 'CUSTOMER'),
       (gen_random_uuid(), 'INFLUENZA_VACCINATION', 'Equine influenza vaccination record', 'PER_HORSE', 'CUSTOMER'),
       (gen_random_uuid(), 'EIA_TEST', 'EIA (Coggins) test result', 'PER_HORSE', 'CUSTOMER'),
       (gen_random_uuid(), 'EXPORT_HEALTH_CERT', 'Export health certificate', 'PER_HORSE', 'AUTHORITY'),
       (gen_random_uuid(), 'PROOF_OF_OWNERSHIP', 'Proof of ownership', 'PER_HORSE', 'CUSTOMER'),
       (gen_random_uuid(), 'IMPORT_PERMIT', 'Import permit', 'PER_SHIPMENT', 'AUTHORITY'),
       (gen_random_uuid(), 'TRANSIT_INSURANCE', 'Transit insurance certificate', 'PER_SHIPMENT', 'CUSTOMER'),
       (gen_random_uuid(), 'CUSTOMS_VALUE_DECLARATION', 'Customs value declaration', 'PER_SHIPMENT', 'CUSTOMER');
