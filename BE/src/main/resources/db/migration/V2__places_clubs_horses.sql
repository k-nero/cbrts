-- Domains B and C (docs/database/database-design.md §4, §5): places, corridors, clubs and horses.

create table countries (
    code char(2) not null,
    name varchar(80) not null,
    primary key (code)
);

create table places (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    name varchar(160) not null,
    kind varchar(20) not null
        constraint places_kind_check check (kind in ('TRAINING_CENTRE', 'STUD', 'RACECOURSE', 'STABLE', 'AIRPORT',
                                                     'CARGO_TERMINAL', 'QUARANTINE', 'WELFARE_STOP')),
    city varchar(80),
    country_code char(2) not null references countries (code),
    address varchar(300),
    primary key (id)
);

create table border_crossings (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    name varchar(120) not null unique,
    from_country char(2) not null references countries (code),
    to_country char(2) not null references countries (code),
    road_only boolean not null default false,
    primary key (id),
    constraint border_crossings_countries_check check (from_country <> to_country)
);

create table corridors (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    code varchar(40) not null unique,
    mode varchar(10) not null constraint corridors_mode_check check (mode in ('ROAD', 'AIR')),
    origin_city varchar(80) not null,
    destination_city varchar(80) not null,
    distance_km integer,
    primary key (id)
);

create table corridor_crossings (
    corridor_id uuid not null references corridors (id) on delete cascade,
    seq smallint not null,
    border_crossing_id uuid not null references border_crossings (id),
    primary key (corridor_id, seq)
);

create table clubs (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    name varchar(160) not null,
    booking_email varchar(255) not null,
    phone varchar(20),
    country_code char(2) references countries (code),
    primary key (id)
);

create table horse_size_classes (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    code varchar(4) not null unique,
    width_in smallint not null,
    max_weight_kg smallint,
    primary key (id)
);

create table horses (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    club_id uuid not null references clubs (id),
    name varchar(80) not null,
    coat varchar(20) constraint horses_coat_check check (coat in ('GREY', 'BLACK', 'CHESTNUT', 'BAY', 'OTHER')),
    breed varchar(60),
    sex varchar(10) not null
        constraint horses_sex_check check (sex in ('STALLION', 'MARE', 'GELDING', 'COLT', 'FILLY')),
    date_of_birth date,
    height_hh numeric(3, 1),
    weight_kg smallint,
    size_class_id uuid not null references horse_size_classes (id),
    microchip varchar(20) unique,
    passport_no varchar(40),
    declared_value numeric(14, 2) not null,
    value_currency char(3) not null default 'USD',
    temperament varchar(20)
        constraint horses_temperament_check check (temperament in ('CALM', 'NERVOUS', 'AGGRESSIVE')),
    required_stall varchar(20) not null default 'STANDARD'
        constraint horses_required_stall_check check (required_stall in ('STANDARD', 'BOX', 'CLIMATE')),
    handling_notes text,
    archived_at timestamptz,
    primary key (id)
);

-- A name is unique per club among active horses; archived horses keep theirs.
create unique index horses_club_id_name_idx on horses (club_id, lower(name)) where archived_at is null;

-- Reference rows.
insert into countries (code, name) values
    ('VN', 'Vietnam'),
    ('KH', 'Cambodia'),
    ('TH', 'Thailand'),
    ('LA', 'Laos'),
    ('MY', 'Malaysia'),
    ('HK', 'Hong Kong');

insert into horse_size_classes (id, code, width_in) values
    (gen_random_uuid(), 'S', 32),
    (gen_random_uuid(), 'M', 32),
    (gen_random_uuid(), 'L', 48),
    (gen_random_uuid(), 'XL', 96);
