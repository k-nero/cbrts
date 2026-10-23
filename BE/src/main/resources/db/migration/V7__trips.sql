-- Trips (US-F3-09, docs/shared-trips-design.md): what physically moves, above the jobs it carries. A trip has a
-- route, one or more vehicles with their crews, and the horses of one or more jobs; the job stays the commercial and
-- legal unit. This migration adds the trip tables, makes every existing job a one-job trip, and moves the route,
-- load plans, bookings, crew and trip log from the job to the trip.

create type TripHorseStatus as enum ('ON_TRIP', 'MOVED', 'DELIVERED', 'LEFT_IN_CARE');

create table public.trips
(
    created_at           timestamp(6) with time zone default now()          not null,
    updated_at           timestamp(6) with time zone                        not null,
    planned_departure_at timestamp(6) with time zone,
    status               TripStatus                  default 'NOT_STARTED'  not null,
    id                   uuid                        default uuidv7()       not null
        primary key,
    corridor_id          uuid                                               not null
        constraint trips_corridor_id_fkey
            references public.corridors,
    created_by           uuid                                               not null
        constraint trips_created_by_fkey
            references public.users,
    code                 varchar(14)                                        not null
        unique
);

-- A convoy is a trip with several vehicles; seq orders them in the convoy.
create table public.trip_vehicles
(
    seq        smallint                                  not null,
    created_at timestamp(6) with time zone default now() not null,
    updated_at timestamp(6) with time zone               not null,
    id         uuid                     default uuidv7() not null
        primary key,
    trip_id    uuid                                      not null
        constraint trip_vehicles_trip_id_fkey
            references public.trips on delete cascade,
    vehicle_id uuid                                      not null
        constraint trip_vehicles_vehicle_id_fkey
            references public.vehicles,
    unique (trip_id, vehicle_id),
    unique (trip_id, seq)
);

-- Which horse rides which trip. A horse moved by an incident keeps its old row as MOVED, so history shows where it
-- was. The horse belongs to the job's request, and before departure all of a job's horses are on one trip; both are
-- checked by the application.
create table public.trip_horses
(
    created_at timestamp(6) with time zone default now()     not null,
    updated_at timestamp(6) with time zone                   not null,
    status     TripHorseStatus             default 'ON_TRIP' not null,
    id         uuid                        default uuidv7()  not null
        primary key,
    trip_id    uuid                                          not null
        constraint trip_horses_trip_id_fkey
            references public.trips on delete cascade,
    job_id     uuid                                          not null
        constraint trip_horses_job_id_fkey
            references public.transport_jobs on delete cascade,
    horse_id   uuid                                          not null
        constraint trip_horses_horse_id_fkey
            references public.horses,
    unique (trip_id, horse_id)
);

create index trip_vehicles_vehicle_id_idx on trip_vehicles (vehicle_id);
create index trip_horses_job_id_idx on trip_horses (job_id);
create index trip_horses_horse_id_idx on trip_horses (horse_id);
-- A job's horse is on one trip at a time. The same horse may be on two jobs, an outbound move and a later return, so
-- this is per job, not per horse.
create unique index trip_horses_job_id_horse_id_on_trip_idx on trip_horses (job_id, horse_id) where status = 'ON_TRIP';

-- 1. One trip per existing job, numbered TRP-YYYY-NNN in approval order within the year it was approved.

create temporary table job_trips on commit drop as
select j.id                                                                  as job_id,
       uuidv7()                                                              as trip_id,
       extract(year from j.approved_at at time zone 'Asia/Ho_Chi_Minh')::int as year,
       row_number() over (partition by extract(year from j.approved_at at time zone 'Asia/Ho_Chi_Minh')
                          order by j.approved_at, j.id)                      as n
from transport_jobs j;

insert into trips (id, created_at, updated_at, planned_departure_at, status, corridor_id, created_by, code)
select jt.trip_id, j.approved_at, now(), j.planned_departure_at, j.trip_status, r.corridor_id, j.approved_by,
       'TRP-' || jt.year || '-' || lpad(jt.n::text, 3, '0')
from job_trips jt
         join transport_jobs j on j.id = jt.job_id
         join transport_requests r on r.id = j.request_id;

insert into code_counters (created_at, updated_at, prefix, year, last_value)
select now(), now(), 'TRP', year, max(n)
from job_trips
group by year;

insert into trip_horses (created_at, updated_at, status, trip_id, job_id, horse_id)
select now(),
       now(),
       case
           when j.trip_status = 'DELIVERED' or j.stage in ('HANDOVER', 'CLOSED') then 'DELIVERED'
           else 'ON_TRIP' end::TripHorseStatus,
       jt.trip_id,
       j.id,
       rh.horse_id
from job_trips jt
         join transport_jobs j on j.id = jt.job_id
         join request_horses rh on rh.request_id = j.request_id;

-- 2. The trip's vehicle. A job had one load plan in practice: the confirmed one, else the newest draft. Older plans
-- of the same job are removed with their placements, since a vehicle on a trip has one load plan.

delete
from load_plans lp
where lp.id <> (select keep.id
                from load_plans keep
                where keep.job_id = lp.job_id
                order by (keep.status = 'CONFIRMED') desc, keep.created_at desc
                limit 1);

-- A job crewed or booked before it had a load plan takes its vehicle from the booking, else from its route's first
-- road leg.
insert into trip_vehicles (created_at, updated_at, seq, trip_id, vehicle_id)
select now(), now(), 1, jt.trip_id, v.vehicle_id
from job_trips jt
         cross join lateral (select coalesce(
                                            (select lp.vehicle_id from load_plans lp where lp.job_id = jt.job_id),
                                            (select b.vehicle_id
                                             from vehicle_bookings b
                                             where b.job_id = jt.job_id
                                             order by b.starts_at
                                             limit 1),
                                            (select l.vehicle_id
                                             from route_legs l
                                                      join route_plans p on p.id = l.route_plan_id
                                             where p.job_id = jt.job_id
                                               and l.vehicle_id is not null
                                             order by (p.status = 'CONFIRMED') desc, p.version_no desc, l.seq
                                             limit 1)) as vehicle_id) v
where v.vehicle_id is not null;

-- 3. Load plans belong to the trip's vehicle.

alter table load_plans
    add column trip_vehicle_id uuid
        constraint load_plans_trip_vehicle_id_fkey
            references public.trip_vehicles on delete cascade;

update load_plans lp
set trip_vehicle_id = tv.id
from job_trips jt
         join trip_vehicles tv on tv.trip_id = jt.trip_id
where jt.job_id = lp.job_id;

drop index load_plans_job_id_confirmed_idx;
alter table load_plans
    alter column trip_vehicle_id set not null,
    add constraint load_plans_trip_vehicle_id_key unique (trip_vehicle_id),
    drop column job_id,
    drop column vehicle_id;

-- 4. Crew is on a trailer. Crew of a job that has no vehicle anywhere can't travel with one, so it is removed and is
-- assigned again once the load plan names the vehicle.

alter table crew_assignments
    add column trip_vehicle_id uuid
        constraint crew_assignments_trip_vehicle_id_fkey
            references public.trip_vehicles on delete cascade;

update crew_assignments ca
set trip_vehicle_id = tv.id
from job_trips jt
         join trip_vehicles tv on tv.trip_id = jt.trip_id
where jt.job_id = ca.job_id;

delete
from crew_assignments
where trip_vehicle_id is null;

alter table crew_assignments
    alter column trip_vehicle_id set not null,
    drop constraint crew_assignments_job_id_user_id_key,
    add constraint crew_assignments_trip_vehicle_id_user_id_key unique (trip_vehicle_id, user_id),
    drop column job_id;

-- 5. The fleet calendar books a vehicle for a trip, once, however many jobs it carries.

alter table vehicle_bookings
    add column trip_id uuid
        constraint vehicle_bookings_trip_id_fkey
            references public.trips on delete cascade;

update vehicle_bookings b
set trip_id = jt.trip_id
from job_trips jt
where jt.job_id = b.job_id;

alter table vehicle_bookings
    drop constraint vehicle_bookings_job_check,
    add constraint vehicle_bookings_trip_check check ((kind = 'JOB') = (trip_id is not null)),
    drop column job_id;

-- 6. Route plans, their versions and the confirmed one are per trip. A pickup or delivery stop names the job whose
-- horses it collects or hands over; border, welfare and other stops belong to the whole trip.

alter table route_plans
    add column trip_id uuid
        constraint route_plans_trip_id_fkey
            references public.trips on delete cascade;

update route_plans p
set trip_id = jt.trip_id
from job_trips jt
where jt.job_id = p.job_id;

alter table route_stops
    add column job_id uuid
        constraint route_stops_job_id_fkey
            references public.transport_jobs;

update route_stops s
set job_id = p.job_id
from route_plans p
where p.id = s.route_plan_id
  and s.kind in ('PICKUP', 'DELIVERY');

drop index route_plans_job_id_confirmed_idx;
alter table route_plans
    alter column trip_id set not null,
    drop constraint route_plans_job_id_version_no_key,
    add constraint route_plans_trip_id_version_no_key unique (trip_id, version_no),
    drop column job_id;
create unique index route_plans_trip_id_confirmed_idx on route_plans (trip_id) where status = 'CONFIRMED';

alter table route_stops
    add constraint route_stops_job_check check ((kind in ('PICKUP', 'DELIVERY')) = (job_id is not null));
create index route_stops_job_id_idx on route_stops (job_id);

-- 7. The trip log is the trip's. A condition log names its horse, so each customer sees their own horses' entries.
-- trip_records is append-only, so its trigger is paused while the column moves.

alter table trip_records
    add column trip_id uuid
        constraint trip_records_trip_id_fkey
            references public.trips;

alter table trip_records
    disable trigger trip_records_append_only;
update trip_records r
set trip_id = jt.trip_id
from job_trips jt
where jt.job_id = r.job_id;
alter table trip_records
    enable trigger trip_records_append_only;

drop index trip_records_job_id_occurred_at_idx;
alter table trip_records
    alter column trip_id set not null,
    drop column job_id;
create index trip_records_trip_id_occurred_at_idx on trip_records (trip_id, occurred_at);

-- A trip departs only when every job with horses on it is clearance-ready (BR-F2-03).
create or replace function trip_records_clearance_gate() returns trigger
    language plpgsql as
$$
declare
    blocked varchar;
begin
    if new.kind = 'DEPARTED' then
        select j.code
        into blocked
        from trip_horses th
                 join transport_jobs j on j.id = th.job_id
        where th.trip_id = new.trip_id
          and th.status = 'ON_TRIP'
          and j.dossier_status <> 'CLEARANCE_READY'
        limit 1;
        if blocked is not null then
            raise exception 'Job % is not clearance-ready; trip cannot depart (BR-F2-03)', blocked
                using errcode = 'check_violation';
        end if;
    end if;
    return new;
end
$$;
