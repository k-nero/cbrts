-- Domain H (§10): vehicles, crews, load plans and versioned route plans (road and air legs).

-- For the vehicle double-booking exclusion constraint (trusted extension, no superuser needed).
create
extension if not exists btree_gist;

create table vehicles
(
    id         uuid        not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    code       varchar(20) not null unique,
    kind       varchar(10) not null
        constraint vehicles_kind_check check (kind in ('TRAILER', 'TRUCK')),
    payload_kg integer     not null,
    status     varchar(12) not null default 'ACTIVE'
        constraint vehicles_status_check check (status in ('ACTIVE', 'MAINTENANCE', 'RETIRED')),
    primary key (id)
);

create table vehicle_stalls
(
    id          uuid        not null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz,
    vehicle_id  uuid        not null references vehicles (id) on delete cascade,
    position_no smallint    not null,
    stall_type  varchar(20) not null default 'STANDARD'
        constraint vehicle_stalls_stall_type_check check (stall_type in ('STANDARD', 'BOX', 'CLIMATE')),
    row_no      smallint    not null,
    side        varchar(5)  not null
        constraint vehicle_stalls_side_check check (side in ('LEFT', 'RIGHT')),
    near_ramp   boolean     not null default false,
    primary key (id),
    unique (vehicle_id, position_no)
);

create table vehicle_bookings
(
    id         uuid        not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    vehicle_id uuid        not null references vehicles (id),
    job_id     uuid references transport_jobs (id) on delete cascade,
    kind       varchar(12) not null
        constraint vehicle_bookings_kind_check check (kind in ('JOB', 'MAINTENANCE', 'HOLD')),
    starts_at  timestamptz not null,
    ends_at    timestamptz not null,
    primary key (id),
    constraint vehicle_bookings_period_check check (starts_at < ends_at),
    constraint vehicle_bookings_job_check check ((kind = 'JOB') = (job_id is not null)),
    -- No double booking.
    constraint vehicle_bookings_no_overlap exclude using gist (vehicle_id with =, tstzrange(starts_at, ends_at) with &&)
);

create table crew_assignments
(
    job_id    uuid        not null references transport_jobs (id) on delete cascade,
    user_id   uuid        not null references users (id),
    crew_role varchar(20) not null
        constraint crew_assignments_crew_role_check check (crew_role in ('DRIVER', 'GROOM', 'FLYING_GROOM', 'VET')),
    primary key (job_id, user_id)
);

create table load_plans
(
    id           uuid        not null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz,
    job_id       uuid        not null references transport_jobs (id) on delete cascade,
    vehicle_id   uuid        not null references vehicles (id),
    status       varchar(12) not null default 'DRAFT'
        constraint load_plans_status_check check (status in ('DRAFT', 'CONFIRMED')),
    confirmed_by uuid references users (id),
    confirmed_at timestamptz,
    primary key (id),
    constraint load_plans_confirmed_check check (status <> 'CONFIRMED' or
                                                 (confirmed_by is not null and confirmed_at is not null))
);

-- One confirmed load plan per job.
create unique index load_plans_job_id_confirmed_idx on load_plans (job_id) where status = 'CONFIRMED';

create table load_plan_stalls
(
    id               uuid        not null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz,
    load_plan_id     uuid        not null references load_plans (id) on delete cascade,
    vehicle_stall_id uuid        not null references vehicle_stalls (id),
    horse_id         uuid        not null references horses (id),
    primary key (id),
    unique (load_plan_id, vehicle_stall_id),
    unique (load_plan_id, horse_id)
);

create table route_plans
(
    id            uuid        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz,
    job_id        uuid        not null references transport_jobs (id) on delete cascade,
    version_no    smallint    not null,
    status        varchar(12) not null default 'DRAFT'
        constraint route_plans_status_check check (status in ('DRAFT', 'CONFIRMED', 'SUPERSEDED')),
    distance_km   integer,
    duration_min  integer,
    confirmed_by  uuid references users (id),
    confirmed_at  timestamptz,
    superseded_at timestamptz,
    change_reason varchar(500),
    primary key (id),
    unique (job_id, version_no),
    constraint route_plans_superseded_check check (status <> 'SUPERSEDED' or
                                                   (superseded_at is not null and change_reason is not null))
);

-- One confirmed route plan per job; older ones are SUPERSEDED, never deleted.
create unique index route_plans_job_id_confirmed_idx on route_plans (job_id) where status = 'CONFIRMED';

-- The doc lists (route_plan_id, seq) as the key; stops get a surrogate id because legs and trip records point at them.
create table route_stops
(
    id                 uuid        not null,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz,
    route_plan_id      uuid        not null references route_plans (id) on delete cascade,
    seq                smallint    not null,
    kind               varchar(12) not null
        constraint route_stops_kind_check check (kind in ('PICKUP', 'BORDER', 'WELFARE', 'DELIVERY', 'AIRPORT_OUT',
                                                          'AIRPORT_IN', 'QUARANTINE')),
    place_id           uuid references places (id),
    border_crossing_id uuid references border_crossings (id),
    planned_at         timestamptz,
    planned_stay_min   smallint,
    details            varchar(500),
    primary key (id),
    unique (route_plan_id, seq),
    constraint route_stops_location_check check (
        (kind = 'BORDER' and border_crossing_id is not null) or (kind <> 'BORDER' and place_id is not null))
);

create table route_legs
(
    id            uuid        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz,
    route_plan_id uuid        not null references route_plans (id) on delete cascade,
    seq           smallint    not null,
    from_stop_id  uuid        not null references route_stops (id),
    to_stop_id    uuid        not null references route_stops (id),
    mode          varchar(10) not null
        constraint route_legs_mode_check check (mode in ('ROAD', 'AIR')),
    vehicle_id    uuid references vehicles (id),
    distance_km   integer,
    planned_min   integer,
    primary key (id),
    unique (route_plan_id, seq),
    constraint route_legs_stops_check check (from_stop_id <> to_stop_id),
    constraint route_legs_air_vehicle_check check (mode = 'ROAD' or vehicle_id is null)
);

create table flights
(
    id                     uuid        not null,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz,
    route_leg_id           uuid        not null unique references route_legs (id) on delete cascade,
    airline                varchar(80) not null,
    flight_no              varchar(12) not null,
    air_waybill            varchar(20),
    aircraft_type          varchar(40),
    stall_positions        smallint,
    service_class          varchar(10)
        constraint flights_service_class_check check (service_class in ('ECONOMY', 'BUSINESS', 'FIRST')),
    scheduled_departure_at timestamptz,
    scheduled_arrival_at   timestamptz,
    estimated_departure_at timestamptz,
    estimated_arrival_at   timestamptz,
    primary key (id)
);
