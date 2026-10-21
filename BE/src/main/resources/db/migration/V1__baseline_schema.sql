-- For the vehicle double-booking exclusion constraint (trusted extension, no superuser needed).
create extension if not exists btree_gist;

-- Native enum types, one per Java enum, named after its simple name as Hibernate's PostgreSQLEnumJdbcType
-- expects (hibernate.type.prefer_native_enum_types). Values follow the Java declaration order.
create type AccountTokenPurpose as enum ('VERIFY_EMAIL', 'STAFF_INVITE', 'RESET_PASSWORD');
create type ArrivalMode as enum ('ANY_TIME', 'WINDOW');
create type AuthorityKind as enum ('VETERINARY', 'CUSTOMS', 'QUARANTINE');
create type BookingKind as enum ('JOB', 'MAINTENANCE', 'HOLD');
create type CatalogStatus as enum ('DRAFT', 'PUBLISHED', 'RETIRED');
create type Channel as enum ('WEB', 'CAB_TABLET', 'SYSTEM');
create type ChecklistHolder as enum ('CUSTOMER', 'SPECIALIST', 'AUTHORITY');
create type ChecklistStatus as enum ('NOT_ISSUED', 'AWAITING_UPLOAD', 'IN_REVIEW', 'CLEARED', 'REJECTED', 'WITH_AUTHORITY');
create type CodePrefix as enum ('REQ', 'Q', 'CBRT', 'EF', 'INV');
create type CrewRole as enum ('DRIVER', 'GROOM', 'FLYING_GROOM', 'VET');
create type DocumentProvider as enum ('CUSTOMER', 'AUTHORITY');
create type DocumentReview as enum ('PENDING', 'APPROVED', 'REJECTED');
create type DocumentScope as enum ('PER_HORSE', 'PER_SHIPMENT', 'PER_CROSSING');
create type DossierStatus as enum ('OPEN', 'SUBMITTED_TO_AUTHORITY', 'ADDITIONAL_INFO_REQUIRED', 'CLEARANCE_READY');
create type EscortKind as enum ('DRIVER', 'GROOM');
create type FeeBandKind as enum ('CANCELLATION', 'SHORT_NOTICE');
create type HandoverOutcome as enum ('CONFIRMED_SOUND', 'PROBLEM_REPORTED');
create type HorseCoat as enum ('GREY', 'BLACK', 'CHESTNUT', 'BAY', 'OTHER');
create type HorseCondition as enum ('SOUND', 'WATCH', 'CONCERN');
create type HorseSex as enum ('STALLION', 'MARE', 'GELDING', 'COLT', 'FILLY');
create type IncidentKind as enum ('HELD', 'CUSTOMER_REPORT', 'WELFARE', 'VEHICLE');
create type IncidentSource as enum ('CAB', 'CUSTOMER', 'STAFF');
create type IncidentStatus as enum ('OPEN', 'DECIDED', 'RESOLVED');
create type InsuranceOption as enum ('OWN_POLICY', 'EQUIFREIGHT');
create type InvoiceKind as enum ('DEPOSIT', 'FINAL', 'CREDIT_NOTE');
create type InvoiceLineKind as enum ('QUOTED', 'ACTUALISED', 'DEPOSIT', 'DEPOSIT_DEDUCTION', 'LATE_PENALTY_CREDIT', 'ADJUSTMENT');
create type InvoiceStatus as enum ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');
create type JobStage as enum ('DOCUMENTS', 'CLEARANCE', 'TRIP', 'HANDOVER', 'CLOSED');
create type LineCertainty as enum ('FIXED', 'ESTIMATED', 'OVERRIDDEN');
create type LineSource as enum ('CATALOG', 'MANUAL');
create type LoadPlanStatus as enum ('DRAFT', 'CONFIRMED');
create type NoteStatus as enum ('OPEN', 'ANSWERED', 'CLOSED');
create type NoteTopic as enum ('DOCUMENTS', 'DATES_PRICE_CHANGES', 'TRIP', 'OTHER');
create type PaymentMethod as enum ('BANK_TRANSFER', 'CARD');
create type PaymentStatus as enum ('PENDING', 'CONFIRMED', 'REFUNDED');
create type PlaceKind as enum ('TRAINING_CENTRE', 'STUD', 'RACECOURSE', 'STABLE', 'AIRPORT', 'CARGO_TERMINAL', 'QUARANTINE', 'WELFARE_STOP');
create type QuotationStatus as enum ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED');
create type RateBasis as enum ('PER_HORSE', 'PER_SHIPMENT', 'PER_KM', 'PER_DAY', 'PER_CROSSING', 'PER_HOUR', 'PER_POSITION', 'PER_THREE_HORSES', 'FLIGHT_VET');
create type RateCertainty as enum ('FIXED', 'ESTIMATED');
create type RatePolicyKey as enum ('FUEL_PCT', 'INSURANCE_PCT', 'CONTINGENCY_PCT', 'SERVICE_FEE_PCT', 'DEPOSIT_PCT', 'QUOTE_VALIDITY_DAYS', 'FLIGHT_VET_MIN_HORSES', 'HIGH_VALUE_THRESHOLD', 'ARRIVAL_WINDOW_PCT', 'ARRIVAL_WINDOW_MIN_HOURS', 'LATE_PENALTY_PCT_PER_HOUR', 'LATE_PENALTY_CAP_PCT', 'ESTIMATE_BAND_PCT');
create type RegulationRole as enum ('ORIGIN', 'TRANSIT', 'DESTINATION');
create type RegulationRuleKind as enum ('WINDOW_BEFORE_DEPARTURE', 'VALID_THROUGH_ARRIVAL_PLUS', 'BOOSTER_WINDOW', 'PRESENCE_ONLY');
create type RequestStatus as enum ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUIRED', 'QUOTED', 'CUSTOMER_ACCEPTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');
create type RoutePlanStatus as enum ('DRAFT', 'CONFIRMED', 'SUPERSEDED');
create type RouteStopKind as enum ('PICKUP', 'BORDER', 'WELFARE', 'DELIVERY', 'AIRPORT_OUT', 'AIRPORT_IN', 'QUARANTINE', 'REFUELLING');
create type ServiceClass as enum ('ECONOMY', 'BUSINESS', 'FIRST');
create type StallSide as enum ('LEFT', 'RIGHT');
create type StallType as enum ('STANDARD', 'CLIMATE', 'BOX');
create type SubmissionKind as enum ('EXPORT_HEALTH_CERTS', 'IMPORT_PERMIT', 'CUSTOMS_DOSSIER');
create type SubmissionStatus as enum ('READY_TO_FILE', 'FILED', 'ADDITIONAL_INFO', 'ISSUED', 'REFUSED');
create type Temperament as enum ('CALM', 'NERVOUS', 'AGGRESSIVE');
create type TrailerType as enum ('SHARED', 'PRIVATE');
create type TransportMode as enum ('ROAD', 'AIR');
create type TripRecordKind as enum ('LOADED', 'DEPARTED', 'ARRIVED_AT_STOP', 'CLEARED_BORDER', 'HELD', 'LEFT_STOP', 'CONDITION_CHECK', 'ACCEPTED_BY_AIRLINE', 'FLIGHT_DEPARTED', 'FLIGHT_LANDED', 'RELEASED_BY_AIRLINE', 'DELIVERED', 'HANDED_OVER', 'NOTE');
create type TripStatus as enum ('NOT_STARTED', 'DEPARTED', 'HELD', 'ARRIVED', 'DELIVERED');
create type UserStatus as enum ('INVITED', 'ACTIVE', 'LOCKED', 'DISABLED');
create type Validity as enum ('GREEN', 'AMBER', 'RED');
create type VehicleKind as enum ('TRAILER', 'TRUCK');
create type VehicleStatus as enum ('ACTIVE', 'MAINTENANCE', 'RETIRED');

create table public.code_counters
(
    last_value integer                     default 0        not null,
    prefix     CodePrefix                                   not null,
    year       smallint                                     not null,
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    id         uuid                        default uuidv7() not null
        primary key,
    unique (prefix, year)
);

alter table public.code_counters
    owner to postgres;

create table public.corridors
(
    date_flex_days   smallint                    default 3     not null,
    distance_km      integer,
    created_at       timestamp(6) with time zone default now() not null,
    updated_at       timestamp(6) with time zone               not null,
    mode             TransportMode                             not null,
    id               uuid                                      not null
        primary key,
    code             varchar(40)                               not null
        unique,
    destination_city varchar(80)                               not null,
    origin_city      varchar(80)                               not null
);

alter table public.corridors
    owner to postgres;

create table public.countries
(
    code       char(2)                                      not null
        unique,
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    id         uuid                        default uuidv7() not null
        primary key,
    name       varchar(80)                                  not null
);

alter table public.countries
    owner to postgres;

create table public.authorities
(
    sla_days   smallint,
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    kind       AuthorityKind                                not null,
    country_id uuid                                         not null
        constraint authorities_country_id_fkey
            references public.countries,
    id         uuid                        default uuidv7() not null
        primary key,
    name       varchar(160)                                 not null
);

alter table public.authorities
    owner to postgres;

create table public.border_crossings
(
    road_only       boolean                     default false not null,
    created_at      timestamp(6) with time zone default now() not null,
    updated_at      timestamp(6) with time zone               not null,
    from_country_id uuid                                      not null
        constraint border_crossings_from_country_id_fkey
            references public.countries,
    id              uuid                                      not null
        primary key,
    to_country_id   uuid                                      not null
        constraint border_crossings_to_country_id_fkey
            references public.countries,
    name            varchar(120)                              not null
        unique
);

alter table public.border_crossings
    owner to postgres;

create table public.clubs
(
    created_at    timestamp(6) with time zone default now() not null,
    updated_at    timestamp(6) with time zone               not null,
    country_id    uuid
        constraint clubs_country_id_fkey
            references public.countries,
    id            uuid                                      not null
        primary key,
    phone         varchar(20),
    name          varchar(160)                              not null,
    booking_email varchar(255)                              not null
);

alter table public.clubs
    owner to postgres;

create table public.corridor_crossings
(
    seq                smallint                                  not null,
    created_at         timestamp(6) with time zone default now() not null,
    updated_at         timestamp(6) with time zone               not null,
    border_crossing_id uuid                                      not null
        constraint corridor_crossings_border_crossing_id_fkey
            references public.border_crossings,
    corridor_id        uuid                                      not null
        constraint corridor_crossings_corridor_id_fkey
            references public.corridors on delete cascade,
    id                 uuid                                      not null
        primary key,
    unique (corridor_id, seq)
);

alter table public.corridor_crossings
    owner to postgres;

create table public.document_types
(
    created_at  timestamp(6) with time zone default now() not null,
    updated_at  timestamp(6) with time zone               not null,
    id          uuid                                      not null
        primary key,
    provided_by DocumentProvider                          not null,
    scope       DocumentScope                             not null,
    code        varchar(40)                               not null
        unique,
    name        varchar(120)                              not null
);

alter table public.document_types
    owner to postgres;

create table public.horse_size_classes
(
    code          varchar(4)                                not null
        unique,
    max_weight_kg smallint,
    min_height_hh numeric(3, 1)                             not null,
    width_in      smallint                                  not null,
    created_at    timestamp(6) with time zone default now() not null,
    updated_at    timestamp(6) with time zone               not null,
    id            uuid                                      not null
        primary key
);

alter table public.horse_size_classes
    owner to postgres;

create table public.horses
(
    date_of_birth  date,
    declared_value numeric(14, 2)                                 not null,
    height_hh      numeric(3, 1),
    value_currency char(3)                     default 'USD'      not null,
    weight_kg      smallint,
    archived_at    timestamp(6) with time zone,
    created_at     timestamp(6) with time zone default now()      not null,
    updated_at     timestamp(6) with time zone                    not null,
    sex            HorseSex                                       not null,
    club_id        uuid                                           not null
        constraint horses_club_id_fkey
            references public.clubs,
    id             uuid                                           not null
        primary key,
    size_class_id  uuid                                           not null
        constraint horses_size_class_id_fkey
            references public.horse_size_classes,
    coat           HorseCoat,
    microchip      varchar(20)
        unique,
    required_stall StallType                   default 'STANDARD' not null,
    temperament    Temperament,
    passport_no    varchar(40),
    breed          varchar(60),
    name           varchar(80)                                    not null,
    handling_notes text
);

alter table public.horses
    owner to postgres;

create table public.incident_options
(
    position    smallint                                  not null,
    created_at  timestamp(6) with time zone default now() not null,
    updated_at  timestamp(6) with time zone               not null,
    id          uuid                                      not null
        primary key,
    incident_id uuid                                      not null,
    title       varchar(160)                              not null,
    description varchar(1000),
    facts       jsonb
);

alter table public.incident_options
    owner to postgres;

create table public.places
(
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    country_id uuid                                         not null
        constraint places_country_id_fkey
            references public.countries,
    id         uuid                        default uuidv7() not null
        primary key,
    kind       PlaceKind                                    not null,
    city       varchar(80),
    name       varchar(160)                                 not null,
    address    varchar(300)
);

alter table public.places
    owner to postgres;

create table public.regulation_catalogs
(
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    country_id uuid                                         not null
        unique
        constraint regulation_catalogs_country_id_fkey
            references public.countries,
    id         uuid                        default uuidv7() not null
        primary key,
    name       varchar(120)                                 not null
);

alter table public.regulation_catalogs
    owner to postgres;

create table public.roles
(
    created_at  timestamp(6) with time zone default now() not null,
    updated_at  timestamp(6) with time zone               not null,
    id          uuid                                      not null
        primary key,
    description varchar(255),
    name        varchar(255)                              not null
        unique
);

alter table public.roles
    owner to postgres;

create table public.users
(
    created_at        timestamp(6) with time zone default now()    not null,
    email_verified_at timestamp(6) with time zone,
    last_active_at    timestamp(6) with time zone,
    locked_until      timestamp(6) with time zone,
    updated_at        timestamp(6) with time zone                  not null,
    staff_code        varchar(10)
        unique,
    club_id           uuid
        constraint users_club_id_fkey
            references public.clubs,
    id                uuid                                         not null
        primary key,
    invited_by        uuid
        constraint users_invited_by_fkey
            references public.users,
    escort_kind       EscortKind,
    phone             varchar(20),
    status            UserStatus                  default 'ACTIVE' not null,
    email             varchar(255)
        unique,
    first_name        varchar(255)                                 not null,
    last_name         varchar(255)                                 not null,
    password          varchar(255)                                 not null
);

alter table public.users
    owner to postgres;

create table public.account_tokens
(
    created_at timestamp(6) with time zone default now()    not null,
    expires_at timestamp(6) with time zone                  not null,
    revoked_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone                  not null,
    used_at    timestamp(6) with time zone,
    id         uuid                        default uuidv7() not null
        primary key,
    user_id    uuid                                         not null
        constraint account_tokens_user_id_fkey
            references public.users on delete cascade,
    purpose    AccountTokenPurpose                          not null,
    token_hash varchar(100)                                 not null
        unique
);

alter table public.account_tokens
    owner to postgres;

create table public.audit_log
(
    created_at         timestamp(6) with time zone default now() not null,
    device_recorded_at timestamp(6) with time zone,
    occurred_at        timestamp(6) with time zone default now() not null,
    updated_at         timestamp(6) with time zone               not null,
    channel            Channel                                   not null,
    actor_id           uuid
        constraint audit_log_actor_id_fkey
            references public.users,
    entity_id          uuid,
    id                 uuid                                      not null
        primary key,
    entity_code        varchar(20),
    actor_role         varchar(30),
    entity_type        varchar(40),
    action             varchar(60)                               not null,
    actor_label        varchar(160)                              not null,
    reason             varchar(500),
    summary            varchar(500)                              not null,
    after              jsonb,
    before             jsonb
);

alter table public.audit_log
    owner to postgres;

create table public.files
(
    created_at   timestamp(6) with time zone default now() not null,
    size_bytes   bigint                                    not null,
    updated_at   timestamp(6) with time zone               not null,
    id           uuid                                      not null
        primary key,
    uploaded_by  uuid
        constraint files_uploaded_by_fkey
            references public.users,
    sha256       char(64)                                  not null,
    content_type varchar(100)                              not null,
    storage_key  varchar(300)                              not null
        unique,
    file_name    varchar(255)                              not null
);

alter table public.files
    owner to postgres;

create table public.notifications
(
    created_at  timestamp(6) with time zone default now() not null,
    emailed_at  timestamp(6) with time zone,
    read_at     timestamp(6) with time zone,
    updated_at  timestamp(6) with time zone               not null,
    entity_id   uuid,
    id          uuid                                      not null
        primary key,
    user_id     uuid                                      not null
        constraint notifications_user_id_fkey
            references public.users on delete cascade,
    entity_type varchar(40),
    kind        varchar(40)                               not null,
    title       varchar(160)                              not null,
    body        varchar(1000)
);

alter table public.notifications
    owner to postgres;

create table public.rate_catalog_versions
(
    version_no     integer                                     not null
        unique,
    created_at     timestamp(6) with time zone default now()   not null,
    published_at   timestamp(6) with time zone,
    updated_at     timestamp(6) with time zone                 not null,
    status         CatalogStatus               default 'DRAFT' not null,
    id             uuid                                        not null
        primary key,
    last_edited_by uuid
        constraint rate_catalog_versions_last_edited_by_fkey
            references public.users,
    published_by   uuid
        constraint rate_catalog_versions_published_by_fkey
            references public.users,
    change_note    varchar(500)
);

alter table public.rate_catalog_versions
    owner to postgres;

create table public.rate_fee_bands
(
    max_days   smallint,
    min_days   smallint                                     not null,
    value      numeric(6, 3)                                not null,
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    id         uuid                        default uuidv7() not null
        primary key,
    version_id uuid                                         not null
        constraint rate_fee_bands_version_id_fkey
            references public.rate_catalog_versions on delete cascade,
    kind       FeeBandKind                                  not null
);

alter table public.rate_fee_bands
    owner to postgres;

create table public.rate_lines
(
    default_quantity   numeric(10, 2),
    group_code         char                                         not null,
    min_charge         numeric(14, 2),
    rate               numeric(14, 2)                               not null,
    created_at         timestamp(6) with time zone default now()    not null,
    updated_at         timestamp(6) with time zone                  not null,
    applies_to_sex     HorseSex,
    applies_to_trailer TrailerType,
    certainty          RateCertainty               default 'FIXED'  not null,
    corridor_id        uuid
        constraint rate_lines_corridor_id_fkey
            references public.corridors,
    id                 uuid                                         not null
        primary key,
    version_id         uuid                        default uuidv7() not null
        constraint rate_lines_version_id_fkey
            references public.rate_catalog_versions on delete cascade,
    basis              RateBasis                                    not null,
    code               varchar(40)                                  not null,
    description        varchar(160)                                 not null,
    estimate_note      varchar(300)
);

alter table public.rate_lines
    owner to postgres;

create table public.rate_policies
(
    value      numeric(14, 3)                               not null,
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    id         uuid                        default uuidv7() not null
        primary key,
    version_id uuid                                         not null
        constraint rate_policies_version_id_fkey
            references public.rate_catalog_versions on delete cascade,
    key        RatePolicyKey                                not null,
    unique (version_id, key)
);

alter table public.rate_policies
    owner to postgres;

create table public.rate_service_classes
(
    horses_per_position smallint                                     not null,
    position_rate       numeric(14, 2)                               not null,
    width_per_horse_in  smallint                                     not null,
    created_at          timestamp(6) with time zone default now()    not null,
    updated_at          timestamp(6) with time zone                  not null,
    service_class       ServiceClass                                 not null,
    corridor_id         uuid                        default uuidv7() not null
        constraint rate_service_classes_corridor_id_fkey
            references public.corridors,
    id                  uuid                                         not null
        primary key,
    version_id          uuid                                         not null
        constraint rate_service_classes_version_id_fkey
            references public.rate_catalog_versions on delete cascade
);

alter table public.rate_service_classes
    owner to postgres;

create table public.rate_volume_breaks
(
    discount_pct numeric(5, 2)                             not null,
    max_horses   smallint,
    min_horses   smallint                                  not null,
    created_at   timestamp(6) with time zone default now() not null,
    updated_at   timestamp(6) with time zone               not null,
    corridor_id  uuid
        constraint rate_volume_breaks_corridor_id_fkey
            references public.corridors,
    id           uuid                                      not null
        primary key,
    version_id   uuid                                      not null
        constraint rate_volume_breaks_version_id_fkey
            references public.rate_catalog_versions on delete cascade
);

alter table public.rate_volume_breaks
    owner to postgres;

create table public.refresh_tokens
(
    revoked     boolean                                   not null,
    created_at  timestamp(6) with time zone default now() not null,
    expiry_date timestamp(6) with time zone               not null,
    updated_at  timestamp(6) with time zone               not null,
    id          uuid                                      not null
        primary key,
    user_id     uuid                                      not null
        constraint refresh_tokens_user_id_fkey
            references public.users on delete cascade,
    token       varchar(255)                              not null
        unique
);

alter table public.refresh_tokens
    owner to postgres;

create table public.regulation_versions
(
    arrival_buffer_days     smallint                                    not null,
    domestic_lead_time_days smallint                    default 3       not null,
    lead_time_days          smallint                                    not null,
    quarantine_min_days     smallint                                    not null,
    version_no              integer                                     not null,
    created_at              timestamp(6) with time zone default now()   not null,
    published_at            timestamp(6) with time zone,
    updated_at              timestamp(6) with time zone                 not null,
    status                  CatalogStatus               default 'DRAFT' not null,
    catalog_id              uuid                                        not null
        constraint regulation_versions_catalog_id_fkey
            references public.regulation_catalogs,
    id                      uuid                                        not null
        primary key,
    published_by            uuid
        constraint regulation_versions_published_by_fkey
            references public.users
);

alter table public.regulation_versions
    owner to postgres;

create table public.regulation_rules
(
    mandatory        boolean                     default true  not null,
    max_days         smallint,
    min_days         smallint,
    created_at       timestamp(6) with time zone default now() not null,
    updated_at       timestamp(6) with time zone               not null,
    document_type_id uuid                                      not null
        constraint regulation_rules_document_type_id_fkey
            references public.document_types,
    id               uuid                                      not null
        primary key,
    version_id       uuid                                      not null
        constraint regulation_rules_version_id_fkey
            references public.regulation_versions on delete cascade,
    rule_kind        RegulationRuleKind                        not null,
    description      varchar(500)
);

alter table public.regulation_rules
    owner to postgres;

create table public.sign_in_attempts
(
    succeeded    boolean                                   not null,
    attempted_at timestamp(6) with time zone default now() not null,
    created_at   timestamp(6) with time zone default now() not null,
    updated_at   timestamp(6) with time zone               not null,
    id           uuid                                      not null
        primary key,
    user_id      uuid
        constraint sign_in_attempts_user_id_fkey
            references public.users on delete set null,
    ip           inet,
    email        varchar(255)                              not null
);

alter table public.sign_in_attempts
    owner to postgres;

create table public.transport_requests
(
    cancellation_fee_pct      numeric(5, 2),
    date_flex_days            smallint                    default 0          not null,
    departure_date            date,
    estimate_high             numeric(14, 2),
    estimate_low              numeric(14, 2),
    vet_escort                boolean                     default false      not null,
    cancelled_at              timestamp(6) with time zone,
    created_at                timestamp(6) with time zone default now()      not null,
    lead_time_override_at     timestamp(6) with time zone,
    submitted_at              timestamp(6) with time zone,
    updated_at                timestamp(6) with time zone                    not null,
    window_end                timestamp(6) with time zone,
    window_start              timestamp(6) with time zone,
    air_class                 ServiceClass,
    arrival_mode              ArrivalMode                 default 'ANY_TIME' not null,
    mode                      TransportMode,
    trailer                   TrailerType,
    code                      varchar(14)
        unique,
    club_id                   uuid                                           not null
        constraint transport_requests_club_id_fkey
            references public.clubs,
    corridor_id               uuid
        constraint transport_requests_corridor_id_fkey
            references public.corridors,
    created_by                uuid
        constraint transport_requests_created_by_fkey
            references public.users,
    destination_place_id      uuid
        constraint transport_requests_destination_place_id_fkey
            references public.places,
    id                        uuid                                           not null
        primary key,
    lead_time_override_by     uuid
        constraint transport_requests_lead_time_override_by_fkey
            references public.users,
    origin_place_id           uuid
        constraint transport_requests_origin_place_id_fkey
            references public.places,
    insurance                 InsuranceOption,
    status                    RequestStatus               default 'DRAFT'    not null,
    destination_text          varchar(160),
    origin_text               varchar(160),
    lead_time_override_reason varchar(500),
    reject_reason             varchar(500),
    special_instructions      varchar(500),
    info_required_note        varchar(1000)
);

alter table public.transport_requests
    owner to postgres;

create table public.quotations
(
    arrival_window_surcharge  numeric(14, 2),
    contingency               numeric(14, 2),
    currency                  char(3)                                     not null,
    deposit_amount            numeric(14, 2),
    deposit_pct               numeric(5, 2),
    fuel                      numeric(14, 2),
    insurance                 numeric(14, 2),
    late_penalty_cap_pct      numeric(5, 2),
    late_penalty_pct_per_hour numeric(5, 2),
    service_fee               numeric(14, 2),
    subtotal                  numeric(14, 2),
    total                     numeric(14, 2),
    version_no                smallint                                    not null,
    volume_break              numeric(14, 2),
    accepted_at               timestamp(6) with time zone,
    created_at                timestamp(6) with time zone default now()   not null,
    declined_at               timestamp(6) with time zone,
    issued_at                 timestamp(6) with time zone,
    reminder_sent_at          timestamp(6) with time zone,
    updated_at                timestamp(6) with time zone                 not null,
    valid_until               timestamp(6) with time zone,
    air_class                 ServiceClass,
    status                    QuotationStatus             default 'DRAFT' not null,
    code                      varchar(14)                                 not null,
    accepted_by               uuid
        constraint quotations_accepted_by_fkey
            references public.users,
    id                        uuid                                        not null
        primary key,
    prepared_by               uuid
        constraint quotations_prepared_by_fkey
            references public.users,
    rate_catalog_version_id   uuid                                        not null
        constraint quotations_rate_catalog_version_id_fkey
            references public.rate_catalog_versions,
    request_id                uuid                                        not null
        constraint quotations_request_id_fkey
            references public.transport_requests,
    superseded_reason         varchar(300),
    decline_reason            varchar(500),
    fx_rates                  jsonb,
    issued_snapshot           jsonb
);

alter table public.quotations
    owner to postgres;

create table public.quotation_lines
(
    catalog_amount        numeric(14, 2),
    group_code            char                                        not null,
    line_total            numeric(14, 2),
    override_amount       numeric(14, 2),
    position              smallint                                    not null,
    quantity              numeric(10, 2)                              not null,
    unit_rate             numeric(14, 2),
    created_at            timestamp(6) with time zone default now()   not null,
    updated_at            timestamp(6) with time zone                 not null,
    source                LineSource                                  not null,
    certainty             LineCertainty               default 'FIXED' not null,
    horse_id              uuid
        constraint quotation_lines_horse_id_fkey
            references public.horses,
    id                    uuid                                        not null
        primary key,
    quotation_id          uuid                                        not null
        constraint quotation_lines_quotation_id_fkey
            references public.quotations on delete cascade,
    rate_line_id          uuid
        constraint quotation_lines_rate_line_id_fkey
            references public.rate_lines,
    rate_service_class_id uuid
        constraint quotation_lines_rate_service_class_id_fkey
            references public.rate_service_classes,
    basis                 RateBasis                                   not null,
    basis_text            varchar(80),
    line_key              varchar(80),
    description           varchar(160)                                not null,
    estimate_note         varchar(300),
    manual_reason         varchar(300),
    override_reason       varchar(300)
);

alter table public.quotation_lines
    owner to postgres;

create table public.request_horses
(
    declared_value  numeric(14, 2)                            not null,
    size_class_code varchar(4)                                not null,
    with_foal       boolean                     default false not null,
    created_at      timestamp(6) with time zone default now() not null,
    updated_at      timestamp(6) with time zone               not null,
    sex             HorseSex                                  not null,
    horse_id        uuid                                      not null
        constraint request_horses_horse_id_fkey
            references public.horses,
    id              uuid                                      not null
        primary key,
    request_id      uuid                                      not null
        constraint request_horses_request_id_fkey
            references public.transport_requests on delete cascade,
    required_stall  StallType                                 not null,
    unique (request_id, horse_id)
);

alter table public.request_horses
    owner to postgres;

create table public.request_revisions
(
    revision_no  smallint                                  not null,
    created_at   timestamp(6) with time zone default now() not null,
    submitted_at timestamp(6) with time zone               not null,
    updated_at   timestamp(6) with time zone               not null,
    id           uuid                                      not null
        primary key,
    request_id   uuid                                      not null
        constraint request_revisions_request_id_fkey
            references public.transport_requests on delete cascade,
    note         varchar(500),
    payload      jsonb                                     not null
);

alter table public.request_revisions
    owner to postgres;

create table public.transport_jobs
(
    approved_at          timestamp(6) with time zone                       not null,
    clearance_ready_at   timestamp(6) with time zone,
    closed_at            timestamp(6) with time zone,
    created_at           timestamp(6) with time zone default now()         not null,
    delivered_at         timestamp(6) with time zone,
    departed_at          timestamp(6) with time zone,
    planned_arrival_at   timestamp(6) with time zone,
    planned_departure_at timestamp(6) with time zone,
    signed_off_at        timestamp(6) with time zone,
    updated_at           timestamp(6) with time zone                       not null,
    window_end           timestamp(6) with time zone,
    window_start         timestamp(6) with time zone,
    stage                JobStage                    default 'DOCUMENTS'   not null,
    trip_status          TripStatus                  default 'NOT_STARTED' not null,
    code                 varchar(14)                                       not null
        unique,
    approved_by          uuid                                              not null
        constraint transport_jobs_approved_by_fkey
            references public.users,
    id                   uuid                                              not null
        primary key,
    quotation_id         uuid                        default uuidv7()      not null
        constraint transport_jobs_quotation_id_fkey
            references public.quotations,
    request_id           uuid                                              not null
        unique
        constraint transport_jobs_request_id_fkey
            references public.transport_requests,
    signed_off_by        uuid
        constraint transport_jobs_signed_off_by_fkey
            references public.users,
    dossier_status       DossierStatus               default 'OPEN'        not null
);

alter table public.transport_jobs
    owner to postgres;

create table public.authority_submissions
(
    expected_by    date,
    created_at     timestamp(6) with time zone default now()           not null,
    filed_at       timestamp(6) with time zone,
    issued_at      timestamp(6) with time zone,
    updated_at     timestamp(6) with time zone                         not null,
    authority_id   uuid                                                not null
        constraint authority_submissions_authority_id_fkey
            references public.authorities,
    filed_by       uuid
        constraint authority_submissions_filed_by_fkey
            references public.users,
    id             uuid                                                not null
        primary key,
    job_id         uuid                        default uuidv7()        not null
        constraint authority_submissions_job_id_fkey
            references public.transport_jobs on delete cascade,
    result_file_id uuid
        constraint authority_submissions_result_file_id_fkey
            references public.files,
    status         SubmissionStatus            default 'READY_TO_FILE' not null,
    kind           SubmissionKind                                      not null,
    reference_no   varchar(60)
);

alter table public.authority_submissions
    owner to postgres;

create table public.checklist_items
(
    due_date           date,
    validity           Validity,
    created_at         timestamp(6) with time zone default now()        not null,
    evaluated_at       timestamp(6) with time zone,
    updated_at         timestamp(6) with time zone                      not null,
    holder             ChecklistHolder,
    border_crossing_id uuid
        constraint checklist_items_border_crossing_id_fkey
            references public.border_crossings,
    current_version_id uuid,
    document_type_id   uuid                                             not null
        constraint checklist_items_document_type_id_fkey
            references public.document_types,
    horse_id           uuid
        constraint checklist_items_horse_id_fkey
            references public.horses,
    id                 uuid                                             not null
        primary key,
    job_id             uuid                                             not null
        constraint checklist_items_job_id_fkey
            references public.transport_jobs on delete cascade,
    regulation_rule_id uuid
        constraint checklist_items_regulation_rule_id_fkey
            references public.regulation_rules,
    status             ChecklistStatus             default 'NOT_ISSUED' not null,
    validity_note      varchar(300)
);

alter table public.checklist_items
    owner to postgres;

create table public.authority_submission_items
(
    checklist_item_id uuid not null
        constraint authority_submission_items_checklist_item_id_fkey
            references public.checklist_items,
    submission_id     uuid not null
        constraint authority_submission_items_submission_id_fkey
            references public.authority_submissions on delete cascade,
    primary key (checklist_item_id, submission_id)
);

alter table public.authority_submission_items
    owner to postgres;

create table public.crew_assignments
(
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    id         uuid                        default uuidv7() not null
        primary key,
    job_id     uuid                                         not null
        constraint crew_assignments_job_id_fkey
            references public.transport_jobs on delete cascade,
    user_id    uuid                                         not null
        constraint crew_assignments_user_id_fkey
            references public.users,
    crew_role  CrewRole                                     not null,
    unique (job_id, user_id)
);

alter table public.crew_assignments
    owner to postgres;

create table public.document_versions
(
    issued_on         date,
    sampled_on        date,
    valid_until       date,
    version_no        smallint                                      not null,
    created_at        timestamp(6) with time zone default now()     not null,
    reviewed_at       timestamp(6) with time zone,
    updated_at        timestamp(6) with time zone                   not null,
    uploaded_at       timestamp(6) with time zone default now()     not null,
    review            DocumentReview              default 'PENDING' not null,
    checklist_item_id uuid                                          not null
        constraint document_versions_checklist_item_id_fkey
            references public.checklist_items,
    file_id           uuid                                          not null
        constraint document_versions_file_id_fkey
            references public.files,
    id                uuid                                          not null
        primary key,
    reviewed_by       uuid
        constraint document_versions_reviewed_by_fkey
            references public.users,
    uploaded_by       uuid                                          not null
        constraint document_versions_uploaded_by_fkey
            references public.users,
    issuer            varchar(120),
    reject_reason     varchar(500)
);

alter table public.document_versions
    owner to postgres;

alter table public.checklist_items
    add constraint checklist_items_current_version_id_fkey
        foreign key (current_version_id) references public.document_versions;

create table public.handovers
(
    late_minutes     integer,
    penalty_amount   numeric(14, 2),
    confirm_due_at   timestamp(6) with time zone,
    confirmed_at     timestamp(6) with time zone,
    created_at       timestamp(6) with time zone default now() not null,
    delivered_at     timestamp(6) with time zone,
    updated_at       timestamp(6) with time zone               not null,
    confirmed_by     uuid
        constraint handovers_confirmed_by_fkey
            references public.users,
    id               uuid                                      not null
        primary key,
    job_id           uuid                                      not null
        unique
        constraint handovers_job_id_fkey
            references public.transport_jobs,
    customer_outcome HandoverOutcome,
    receiving_name   varchar(120)
);

alter table public.handovers
    owner to postgres;

create table public.invoices
(
    amount_paid         numeric(14, 2)              default 0       not null,
    due_on              date,
    subtotal            numeric(14, 2)              default 0       not null,
    tax_amount          numeric(14, 2)              default 0       not null,
    tax_pct             numeric(5, 2)               default 0       not null,
    total               numeric(14, 2)              default 0       not null,
    created_at          timestamp(6) with time zone default now()   not null,
    issued_at           timestamp(6) with time zone,
    updated_at          timestamp(6) with time zone                 not null,
    voided_at           timestamp(6) with time zone,
    kind                InvoiceKind                                 not null,
    club_id             uuid                                        not null
        constraint invoices_club_id_fkey
            references public.clubs,
    code                varchar(16)                                 not null
        unique,
    corrects_invoice_id uuid
        constraint invoices_corrects_invoice_id_fkey
            references public.invoices,
    id                  uuid                                        not null
        primary key,
    issued_by           uuid
        constraint invoices_issued_by_fkey
            references public.users,
    job_id              uuid
        constraint invoices_job_id_fkey
            references public.transport_jobs,
    quotation_id        uuid                                        not null
        constraint invoices_quotation_id_fkey
            references public.quotations,
    status              InvoiceStatus               default 'DRAFT' not null,
    void_reason         varchar(500)
);

alter table public.invoices
    owner to postgres;

create table public.invoice_lines
(
    amount            numeric(14, 2)                            not null,
    position          smallint                                  not null,
    quantity          numeric(10, 2),
    unit_rate         numeric(14, 2),
    created_at        timestamp(6) with time zone default now() not null,
    updated_at        timestamp(6) with time zone               not null,
    id                uuid                                      not null
        primary key,
    invoice_id        uuid                                      not null
        constraint invoice_lines_invoice_id_fkey
            references public.invoices on delete cascade,
    quotation_line_id uuid
        constraint invoice_lines_quotation_line_id_fkey
            references public.quotation_lines,
    kind              InvoiceLineKind                           not null,
    description       varchar(160)                              not null,
    note              varchar(300)
);

alter table public.invoice_lines
    owner to postgres;

create table public.job_regulation_pins
(
    created_at            timestamp(6) with time zone default now() not null,
    updated_at            timestamp(6) with time zone               not null,
    role                  RegulationRole                            not null,
    id                    uuid                                      not null
        primary key,
    job_id                uuid                                      not null
        constraint job_regulation_pins_job_id_fkey
            references public.transport_jobs on delete cascade,
    regulation_version_id uuid                                      not null
        constraint job_regulation_pins_regulation_version_id_fkey
            references public.regulation_versions,
    unique (job_id, regulation_version_id)
);

alter table public.job_regulation_pins
    owner to postgres;

create table public.notes
(
    created_at        timestamp(6) with time zone default now()  not null,
    reply_due_at      timestamp(6) with time zone,
    updated_at        timestamp(6) with time zone                not null,
    status            NoteStatus                  default 'OPEN' not null,
    assignee_id       uuid
        constraint notes_assignee_id_fkey
            references public.users,
    checklist_item_id uuid
        constraint notes_checklist_item_id_fkey
            references public.checklist_items,
    club_id           uuid                                       not null
        constraint notes_club_id_fkey
            references public.clubs,
    created_by        uuid                                       not null
        constraint notes_created_by_fkey
            references public.users,
    id                uuid                                       not null
        primary key,
    job_id            uuid
        constraint notes_job_id_fkey
            references public.transport_jobs,
    request_id        uuid
        constraint notes_request_id_fkey
            references public.transport_requests,
    topic             NoteTopic                                  not null,
    routed_role       varchar(30)                                not null,
    subject           varchar(160)                               not null,
    body              text                                       not null
);

alter table public.notes
    owner to postgres;

create table public.note_replies
(
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    author_id  uuid                                         not null
        constraint note_replies_author_id_fkey
            references public.users,
    id         uuid                        default uuidv7() not null
        primary key,
    note_id    uuid                                         not null
        constraint note_replies_note_id_fkey
            references public.notes on delete cascade,
    body       text                                         not null
);

alter table public.note_replies
    owner to postgres;

create table public.payments
(
    amount      numeric(14, 2)                                not null,
    created_at  timestamp(6) with time zone default now()     not null,
    received_at timestamp(6) with time zone                   not null,
    updated_at  timestamp(6) with time zone                   not null,
    status      PaymentStatus               default 'PENDING' not null,
    id          uuid                                          not null
        primary key,
    invoice_id  uuid                                          not null
        constraint payments_invoice_id_fkey
            references public.invoices,
    recorded_by uuid
        constraint payments_recorded_by_fkey
            references public.users,
    method      PaymentMethod                                 not null,
    reference   varchar(100)
);

alter table public.payments
    owner to postgres;

create table public.quarantine_periods
(
    ends_on      date                                      not null,
    starts_on    date                                      not null,
    completed_at timestamp(6) with time zone,
    created_at   timestamp(6) with time zone default now() not null,
    updated_at   timestamp(6) with time zone               not null,
    horse_id     uuid
        constraint quarantine_periods_horse_id_fkey
            references public.horses,
    id           uuid                                      not null
        primary key,
    job_id       uuid                                      not null
        constraint quarantine_periods_job_id_fkey
            references public.transport_jobs on delete cascade,
    place_id     uuid                                      not null
        constraint quarantine_periods_place_id_fkey
            references public.places
);

alter table public.quarantine_periods
    owner to postgres;

create table public.route_plans
(
    distance_km   integer,
    duration_min  integer,
    version_no    smallint                                    not null,
    confirmed_at  timestamp(6) with time zone,
    created_at    timestamp(6) with time zone default now()   not null,
    superseded_at timestamp(6) with time zone,
    updated_at    timestamp(6) with time zone                 not null,
    status        RoutePlanStatus             default 'DRAFT' not null,
    confirmed_by  uuid
        constraint route_plans_confirmed_by_fkey
            references public.users,
    id            uuid                                        not null
        primary key,
    job_id        uuid                                        not null
        constraint route_plans_job_id_fkey
            references public.transport_jobs on delete cascade,
    change_reason varchar(500)
);

alter table public.route_plans
    owner to postgres;

create table public.route_stops
(
    planned_stay_min   smallint,
    seq                smallint                                  not null,
    created_at         timestamp(6) with time zone default now() not null,
    planned_at         timestamp(6) with time zone,
    updated_at         timestamp(6) with time zone               not null,
    kind               RouteStopKind                             not null,
    border_crossing_id uuid
        constraint route_stops_border_crossing_id_fkey
            references public.border_crossings,
    id                 uuid                                      not null
        primary key,
    place_id           uuid
        constraint route_stops_place_id_fkey
            references public.places,
    route_plan_id      uuid                                      not null
        constraint route_stops_route_plan_id_fkey
            references public.route_plans on delete cascade,
    details            varchar(500)
);

alter table public.route_stops
    owner to postgres;

create table public.trip_records
(
    created_at    timestamp(6) with time zone default now() not null,
    occurred_at   timestamp(6) with time zone               not null,
    received_at   timestamp(6) with time zone default now() not null,
    updated_at    timestamp(6) with time zone               not null,
    channel       Channel                                   not null,
    client_ref    uuid
        unique,
    id            uuid                                      not null
        primary key,
    job_id        uuid                                      not null
        constraint trip_records_job_id_fkey
            references public.transport_jobs,
    recorded_by   uuid
        constraint trip_records_recorded_by_fkey
            references public.users,
    route_stop_id uuid
        constraint trip_records_route_stop_id_fkey
            references public.route_stops,
    kind          TripRecordKind                            not null,
    text          varchar(500)
);

alter table public.trip_records
    owner to postgres;

create table public.condition_logs
(
    drinking       boolean,
    eating         boolean,
    created_at     timestamp(6) with time zone default now() not null,
    updated_at     timestamp(6) with time zone               not null,
    condition      HorseCondition                            not null,
    horse_id       uuid                                      not null
        constraint condition_logs_horse_id_fkey
            references public.horses,
    id             uuid                                      not null
        primary key,
    trip_record_id uuid                                      not null
        constraint condition_logs_trip_record_id_fkey
            references public.trip_records,
    note           varchar(500)
);

alter table public.condition_logs
    owner to postgres;

create table public.condition_log_files
(
    condition_log_id uuid not null
        constraint condition_log_files_condition_log_id_fkey
            references public.condition_logs,
    file_id          uuid not null
        constraint condition_log_files_file_id_fkey
            references public.files,
    primary key (condition_log_id, file_id)
);

alter table public.condition_log_files
    owner to postgres;

create table public.incidents
(
    stops_clock         boolean                     default false  not null,
    clock_stopped_from  timestamp(6) with time zone,
    clock_stopped_until timestamp(6) with time zone,
    created_at          timestamp(6) with time zone default now()  not null,
    decided_at          timestamp(6) with time zone,
    opened_at           timestamp(6) with time zone default now()  not null,
    reply_due_at        timestamp(6) with time zone,
    resolved_at         timestamp(6) with time zone,
    updated_at          timestamp(6) with time zone                not null,
    source              IncidentSource                             not null,
    status              IncidentStatus              default 'OPEN' not null,
    decided_by          uuid
        constraint incidents_decided_by_fkey
            references public.users,
    decided_option_id   uuid
        constraint incidents_decided_option_id_fkey
            references public.incident_options,
    id                  uuid                                       not null
        primary key,
    job_id              uuid                                       not null
        constraint incidents_job_id_fkey
            references public.transport_jobs,
    owner_id            uuid                                       not null
        constraint incidents_owner_id_fkey
            references public.users,
    trip_record_id      uuid
        constraint incidents_trip_record_id_fkey
            references public.trip_records,
    kind                IncidentKind                               not null,
    summary             varchar(500)                               not null,
    decision_note       varchar(1000)
);

alter table public.incidents
    owner to postgres;

create table public.incident_files
(
    file_id     uuid not null
        constraint incident_files_file_id_fkey
            references public.files,
    incident_id uuid not null
        constraint incident_files_incident_id_fkey
            references public.incidents on delete cascade,
    primary key (file_id, incident_id)
);

alter table public.incident_files
    owner to postgres;

alter table public.incident_options
    add constraint incident_options_incident_id_fkey
        foreign key (incident_id) references public.incidents on delete cascade;

create table public.user_roles
(
    role_id uuid not null
        constraint user_roles_role_id_fkey
            references public.roles,
    user_id uuid not null
        constraint user_roles_user_id_fkey
            references public.users on delete cascade,
    primary key (role_id, user_id)
);

alter table public.user_roles
    owner to postgres;

create table public.vehicles
(
    payload_kg integer                                      not null,
    created_at timestamp(6) with time zone default now()    not null,
    updated_at timestamp(6) with time zone                  not null,
    kind       VehicleKind                                  not null,
    status     VehicleStatus               default 'ACTIVE' not null,
    id         uuid                        default uuidv7() not null
        primary key,
    code       varchar(20)                                  not null
        unique
);

alter table public.vehicles
    owner to postgres;

create table public.load_plans
(
    confirmed_at timestamp(6) with time zone,
    created_at   timestamp(6) with time zone default now()   not null,
    updated_at   timestamp(6) with time zone                 not null,
    status       LoadPlanStatus              default 'DRAFT' not null,
    confirmed_by uuid
        constraint load_plans_confirmed_by_fkey
            references public.users,
    id           uuid                                        not null
        primary key,
    job_id       uuid                                        not null
        constraint load_plans_job_id_fkey
            references public.transport_jobs on delete cascade,
    vehicle_id   uuid                                        not null
        constraint load_plans_vehicle_id_fkey
            references public.vehicles
);

alter table public.load_plans
    owner to postgres;

create table public.route_legs
(
    distance_km   integer,
    planned_min   integer,
    seq           smallint                                  not null,
    created_at    timestamp(6) with time zone default now() not null,
    updated_at    timestamp(6) with time zone               not null,
    mode          TransportMode                             not null,
    from_stop_id  uuid                                      not null
        constraint route_legs_from_stop_id_fkey
            references public.route_stops,
    id            uuid                                      not null
        primary key,
    route_plan_id uuid                                      not null
        constraint route_legs_route_plan_id_fkey
            references public.route_plans on delete cascade,
    to_stop_id    uuid                                      not null
        constraint route_legs_to_stop_id_fkey
            references public.route_stops,
    vehicle_id    uuid
        constraint route_legs_vehicle_id_fkey
            references public.vehicles
);

alter table public.route_legs
    owner to postgres;

create table public.flights
(
    stall_positions        smallint,
    created_at             timestamp(6) with time zone default now() not null,
    estimated_arrival_at   timestamp(6) with time zone,
    estimated_departure_at timestamp(6) with time zone,
    scheduled_arrival_at   timestamp(6) with time zone,
    scheduled_departure_at timestamp(6) with time zone,
    updated_at             timestamp(6) with time zone               not null,
    service_class          ServiceClass,
    flight_no              varchar(12)                               not null,
    id                     uuid                                      not null
        primary key,
    route_leg_id           uuid                                      not null
        unique
        constraint flights_route_leg_id_fkey
            references public.route_legs on delete cascade,
    air_waybill            varchar(20),
    aircraft_type          varchar(40),
    airline                varchar(80)                               not null
);

alter table public.flights
    owner to postgres;

create table public.vehicle_bookings
(
    created_at timestamp(6) with time zone default now()    not null,
    ends_at    timestamp(6) with time zone                  not null,
    starts_at  timestamp(6) with time zone                  not null,
    updated_at timestamp(6) with time zone                  not null,
    kind       BookingKind                                  not null,
    id         uuid                        default uuidv7() not null
        primary key,
    job_id     uuid
        constraint vehicle_bookings_job_id_fkey
            references public.transport_jobs on delete cascade,
    vehicle_id uuid                                         not null
        constraint vehicle_bookings_vehicle_id_fkey
            references public.vehicles
);

alter table public.vehicle_bookings
    owner to postgres;

create table public.vehicle_stalls
(
    near_ramp   boolean                     default false      not null,
    position_no smallint                                       not null,
    row_no      smallint                                       not null,
    side        StallSide                                      not null,
    created_at  timestamp(6) with time zone default now()      not null,
    updated_at  timestamp(6) with time zone                    not null,
    id          uuid                                           not null
        primary key,
    vehicle_id  uuid                                           not null
        constraint vehicle_stalls_vehicle_id_fkey
            references public.vehicles on delete cascade,
    stall_type  StallType                   default 'STANDARD' not null
);

alter table public.vehicle_stalls
    owner to postgres;

create table public.load_plan_stalls
(
    created_at       timestamp(6) with time zone default now()    not null,
    updated_at       timestamp(6) with time zone                  not null,
    horse_id         uuid                        default uuidv7() not null
        constraint load_plan_stalls_horse_id_fkey
            references public.horses,
    id               uuid                                         not null
        primary key,
    load_plan_id     uuid                                         not null
        constraint load_plan_stalls_load_plan_id_fkey
            references public.load_plans on delete cascade,
    vehicle_stall_id uuid                                         not null
        constraint load_plan_stalls_vehicle_stall_id_fkey
            references public.vehicle_stalls
);

alter table public.load_plan_stalls
    owner to postgres;

-- Rules the database enforces on its own, whatever writes the row.

create function catalog_child_guard() returns trigger
    language plpgsql as
$$
declare
    v_status varchar;
begin
    if
        tg_op <> 'INSERT' then
        execute format('select status from %I where id = $1', tg_argv[0]) into v_status using old.version_id;
        if
            v_status <> 'DRAFT' then
            raise exception '%: % belongs to a % catalog version, which is immutable', tg_op, tg_table_name, v_status
                using errcode = 'check_violation';
        end if;
    end if;
    if
        tg_op <> 'DELETE' then
        execute format('select status from %I where id = $1', tg_argv[0]) into v_status using new.version_id;
        if
            v_status <> 'DRAFT' then
            raise exception '%: % belongs to a % catalog version, which is immutable', tg_op, tg_table_name, v_status
                using errcode = 'check_violation';
        end if;
        return new;
    end if;
    return old;
end
$$;

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
                old.valid_until, old.issuer, old.uploaded_by, old.uploaded_at, old.created_at) is distinct from (new.id, new.checklist_item_id, new.version_no, new.file_id, new.issued_on, new.sampled_on,
                                                                                                                 new.valid_until, new.issuer, new.uploaded_by, new.uploaded_at, new.created_at) then
        raise exception 'document_versions is append-only: only a pending version''s review can change (BR-F2-05)'
            using errcode = 'check_violation';
    end if;
    return new;
end
$$;

create function forbid_update_delete() returns trigger
    language plpgsql as
$$
begin
    raise
        exception '% is append-only: % is not allowed', tg_table_name, tg_op using errcode = 'check_violation';
end
$$;

create function request_horses_lock() returns trigger
    language plpgsql as
$$
begin
    if
        exists (select 1
                from transport_requests
                where id in (old.request_id, new.request_id)
                  and status = 'APPROVED') then
        raise exception 'The horses of an approved request are locked (BR-F1-06)' using errcode = 'check_violation';
    end if;
    if
        tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end
$$;

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

-- Append-only tables, catalog immutability, role checks and the clearance gate.

create trigger document_versions_append_only
    before update or
        delete
    on document_versions
    for each row
execute function document_versions_append_only();

create trigger request_horses_lock
    before insert or
        update or
        delete
    on request_horses
    for each row
execute function request_horses_lock();

create trigger trip_records_clearance_gate
    before insert
    on trip_records
    for each row
execute function trip_records_clearance_gate();

create trigger audit_log_append_only
    before update or
        delete
    on audit_log
    for each row
execute function forbid_update_delete();

create trigger condition_log_files_append_only
    before update or
        delete
    on condition_log_files
    for each row
execute function forbid_update_delete();

create trigger condition_logs_append_only
    before update or
        delete
    on condition_logs
    for each row
execute function forbid_update_delete();

create trigger document_versions_reviewed_by_role
    before insert or
        update of reviewed_by
    on document_versions
    for each row
execute function require_role('reviewed_by', 'TRANSPORT_SPECIALIST');

create trigger rate_fee_bands_guard
    before insert or
        update or
        delete
    on rate_fee_bands
    for each row
execute function catalog_child_guard('rate_catalog_versions');

create trigger rate_lines_guard
    before insert or
        update or
        delete
    on rate_lines
    for each row
execute function catalog_child_guard('rate_catalog_versions');

create trigger rate_policies_guard
    before insert or
        update or
        delete
    on rate_policies
    for each row
execute function catalog_child_guard('rate_catalog_versions');

create trigger rate_service_classes_guard
    before insert or
        update or
        delete
    on rate_service_classes
    for each row
execute function catalog_child_guard('rate_catalog_versions');

create trigger rate_volume_breaks_guard
    before insert or
        update or
        delete
    on rate_volume_breaks
    for each row
execute function catalog_child_guard('rate_catalog_versions');

create trigger regulation_rules_guard
    before insert or
        update or
        delete
    on regulation_rules
    for each row
execute function catalog_child_guard('regulation_versions');

create trigger transport_jobs_approved_by_role
    before insert or
        update of approved_by
    on transport_jobs
    for each row
execute function require_role('approved_by', 'LOGISTICS_MANAGER');

create trigger trip_records_append_only
    before update or
        delete
    on trip_records
    for each row
execute function forbid_update_delete();

-- Foreign-key lookups, list orderings, and the partial unique indexes behind "at most one" rules.

create index account_tokens_user_id_idx on account_tokens (user_id);

create index audit_log_action_idx on audit_log (action);

create index audit_log_actor_id_occurred_at_idx on audit_log (actor_id, occurred_at desc);

create index audit_log_entity_code_occurred_at_idx on audit_log (entity_code, occurred_at desc);

create index audit_log_occurred_at_idx on audit_log (occurred_at desc);

create unique index checklist_items_job_document_horse_crossing_idx
    on checklist_items (job_id, document_type_id, horse_id, border_crossing_id) nulls not distinct;

create index condition_log_files_condition_log_id_idx on condition_log_files (condition_log_id);

create unique index horses_club_id_name_idx on horses (club_id, lower(name)) where archived_at is null;

create index incidents_job_id_idx on incidents (job_id);

create index invoices_club_id_idx on invoices (club_id);

create unique index invoices_quotation_id_deposit_idx on invoices (quotation_id) where kind = 'DEPOSIT' and status <> 'VOID';

create unique index invoices_quotation_id_final_idx on invoices (quotation_id) where kind = 'FINAL' and status <> 'VOID';

create unique index load_plans_job_id_confirmed_idx on load_plans (job_id) where status = 'CONFIRMED';

create index notes_club_id_idx on notes (club_id);

create index notifications_user_id_read_at_idx on notifications (user_id, read_at);

create index payments_invoice_id_idx on payments (invoice_id);

create index quotation_lines_quotation_id_idx on quotation_lines (quotation_id);

create index quotations_code_idx on quotations (code);

create unique index quotations_request_id_accepted_idx on quotations (request_id) where status = 'ACCEPTED';

create unique index rate_catalog_versions_draft_idx on rate_catalog_versions (status) where status = 'DRAFT';

create unique index rate_lines_version_id_corridor_id_code_idx
    on rate_lines (version_id, corridor_id, code) nulls not distinct;

create index refresh_tokens_expiry_date_idx on refresh_tokens (expiry_date);

create index refresh_tokens_user_id_idx on refresh_tokens (user_id);

create unique index regulation_versions_draft_idx on regulation_versions (catalog_id) where status = 'DRAFT';

create unique index route_plans_job_id_confirmed_idx on route_plans (job_id) where status = 'CONFIRMED';

create index sign_in_attempts_email_attempted_at_idx on sign_in_attempts (email, attempted_at desc);

create index transport_requests_club_id_idx on transport_requests (club_id);

create index transport_requests_status_idx on transport_requests (status);

create index trip_records_job_id_occurred_at_idx on trip_records (job_id, occurred_at);

create unique index users_club_id_idx on users (club_id) where club_id is not null;

-- Natural keys within a parent: version and sequence numbers, positions, one stall per horse.

alter table horse_size_classes
    add constraint horse_size_classes_min_height_hh_key unique (min_height_hh);
alter table rate_service_classes
    add constraint rate_service_classes_version_id_corridor_id_service_class_key unique (version_id, corridor_id, service_class);
alter table regulation_versions
    add constraint regulation_versions_catalog_id_version_no_key unique (catalog_id, version_no);
alter table regulation_rules
    add constraint regulation_rules_version_id_document_type_id_key unique (version_id, document_type_id);
alter table request_revisions
    add constraint request_revisions_request_id_revision_no_key unique (request_id, revision_no);
alter table quotations
    add constraint quotations_request_id_version_no_key unique (request_id, version_no);
alter table document_versions
    add constraint document_versions_checklist_item_id_version_no_key unique (checklist_item_id, version_no);
alter table vehicle_stalls
    add constraint vehicle_stalls_vehicle_id_position_no_key unique (vehicle_id, position_no);
alter table load_plan_stalls
    add constraint load_plan_stalls_load_plan_id_horse_id_key unique (load_plan_id, horse_id);
alter table load_plan_stalls
    add constraint load_plan_stalls_load_plan_id_vehicle_stall_id_key unique (load_plan_id, vehicle_stall_id);
alter table route_plans
    add constraint route_plans_job_id_version_no_key unique (job_id, version_no);
alter table route_stops
    add constraint route_stops_route_plan_id_seq_key unique (route_plan_id, seq);
alter table route_legs
    add constraint route_legs_route_plan_id_seq_key unique (route_plan_id, seq);
alter table condition_logs
    add constraint condition_logs_trip_record_id_horse_id_key unique (trip_record_id, horse_id);
alter table incident_options
    add constraint incident_options_incident_id_position_key unique (incident_id, "position");
alter table invoice_lines
    add constraint invoice_lines_invoice_id_position_key unique (invoice_id, "position");
alter table condition_log_files
    add constraint condition_log_files_file_id_key unique (file_id);

-- Row rules: states that need their fields, mutually exclusive columns, ordered ranges.

alter table users
    add constraint users_customer_or_staff_check check (club_id is null or staff_code is null);
alter table border_crossings
    add constraint border_crossings_countries_check check (from_country_id <> to_country_id);
alter table corridors
    add constraint corridors_date_flex_days_check check (date_flex_days between 0 and 7);
alter table rate_lines
    add constraint rate_lines_default_quantity_check check (basis <> 'PER_HOUR' or default_quantity is not null);
alter table rate_lines
    add constraint rate_lines_group_code_check check (group_code between 'A' and 'H');
alter table rate_volume_breaks
    add constraint rate_volume_breaks_band_check check (min_horses <= coalesce(max_horses, min_horses));
alter table rate_fee_bands
    add constraint rate_fee_bands_band_check check (min_days <= coalesce(max_days, min_days));
alter table transport_requests
    add constraint transport_requests_arrival_window_check check ( (arrival_mode = 'ANY_TIME' and window_start is null and window_end is null) or (arrival_mode = 'WINDOW' and mode = 'ROAD' and trailer = 'PRIVATE' and date_flex_days = 0 and window_end - window_start >= interval '3 hours'));
alter table transport_requests
    add constraint transport_requests_code_check check ((code is null) = (submitted_at is null));
alter table transport_requests
    add constraint transport_requests_date_flex_days_check check (date_flex_days between 0 and 7);
alter table transport_requests
    add constraint transport_requests_destination_check check (destination_place_id is null or destination_text is null);
alter table transport_requests
    add constraint transport_requests_estimate_check check (estimate_low <= estimate_high);
alter table transport_requests
    add constraint transport_requests_info_required_note_check check (status <> 'INFO_REQUIRED' or info_required_note is not null);
alter table transport_requests
    add constraint transport_requests_mode_options_check check ( (mode = 'ROAD' and air_class is null) or (mode = 'AIR' and trailer is null));
alter table transport_requests
    add constraint transport_requests_origin_check check (origin_place_id is null or origin_text is null);
alter table transport_requests
    add constraint transport_requests_reject_reason_check check (status <> 'REJECTED' or reject_reason is not null);
alter table transport_requests
    add constraint transport_requests_route_check check (submitted_at is null or (corridor_id is not null and departure_date is not null));
alter table request_horses
    add constraint request_horses_with_foal_check check (not with_foal or sex = 'MARE');
alter table quotations
    add constraint quotations_issued_totals_check check (status = 'DRAFT' or (issued_at is not null and total is not null));
alter table quotation_lines
    add constraint quotation_lines_group_code_check check (group_code between 'A' and 'H');
alter table quotation_lines
    add constraint quotation_lines_manual_check check (manual_reason is null or (source = 'MANUAL' and unit_rate is not null));
alter table quotation_lines
    add constraint quotation_lines_override_reason_check check (override_amount is null or override_reason is not null);
alter table quotation_lines
    add constraint quotation_lines_rate_line_check check (source <> 'CATALOG' or num_nonnulls(rate_line_id, rate_service_class_id) = 1);
alter table transport_jobs
    add constraint transport_jobs_clearance_gate_check check ( departed_at is null or (dossier_status = 'CLEARANCE_READY' and clearance_ready_at <= departed_at));
alter table transport_jobs
    add constraint transport_jobs_window_check check (window_end is null or window_start < window_end);
alter table document_versions
    add constraint document_versions_reject_reason_check check (review <> 'REJECTED' or reject_reason is not null);
alter table document_versions
    add constraint document_versions_reviewed_check check (review = 'PENDING' or (reviewed_by is not null and reviewed_at is not null));
alter table quarantine_periods
    add constraint quarantine_periods_dates_check check (starts_on <= ends_on);
alter table vehicle_bookings
    add constraint vehicle_bookings_job_check check ((kind = 'JOB') = (job_id is not null));
alter table vehicle_bookings
    add constraint vehicle_bookings_period_check check (starts_at < ends_at);
alter table load_plans
    add constraint load_plans_confirmed_check check (status <> 'CONFIRMED' or (confirmed_by is not null and confirmed_at is not null));
alter table route_plans
    add constraint route_plans_superseded_check check (status <> 'SUPERSEDED' or (superseded_at is not null and change_reason is not null));
alter table route_stops
    add constraint route_stops_location_check check ( (kind = 'BORDER' and border_crossing_id is not null) or (kind <> 'BORDER' and place_id is not null));
alter table route_legs
    add constraint route_legs_air_vehicle_check check (mode = 'ROAD' or vehicle_id is null);
alter table route_legs
    add constraint route_legs_stops_check check (from_stop_id <> to_stop_id);
alter table incidents
    add constraint incidents_clock_check check (clock_stopped_until is null or clock_stopped_from < clock_stopped_until);
alter table notes
    add constraint notes_subject_check check (request_id is not null or job_id is not null);
alter table invoices
    add constraint invoices_credit_note_check check ((kind = 'CREDIT_NOTE') = (corrects_invoice_id is not null));
alter table invoices
    add constraint invoices_final_job_check check (kind <> 'FINAL' or job_id is not null);
alter table invoices
    add constraint invoices_void_check check (status <> 'VOID' or (voided_at is not null and void_reason is not null));
alter table invoice_lines
    add constraint invoice_lines_note_check check (kind not in ('ACTUALISED', 'ADJUSTMENT') or note is not null);
alter table payments
    add constraint payments_amount_check check (amount > 0);

-- No double booking.
alter table vehicle_bookings
    add constraint vehicle_bookings_no_overlap
        exclude using gist (vehicle_id with =, tstzrange(starts_at, ends_at) with &&);
