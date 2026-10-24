-- US-F5-06: a job, or some of its horses, leaves a moving trip through an incident decision
-- (docs/shared-trips-design.md, "Leaving a moving trip"; docs/incidents-design.md). A job can then span two trips,
-- so departure, sign-off and delivery become per part: a job's part on one trip.

create table public.trip_jobs
(
    id            uuid                        default uuidv7()      not null primary key,
    trip_id       uuid                                              not null
        constraint trip_jobs_trip_id_fkey references public.trips on delete cascade,
    job_id        uuid                                              not null
        constraint trip_jobs_job_id_fkey references public.transport_jobs,
    status        TripStatus                  default 'NOT_STARTED' not null,
    departed_at   timestamp(6) with time zone,
    delivered_at  timestamp(6) with time zone,
    signed_off_at timestamp(6) with time zone,
    signed_off_by uuid
        constraint trip_jobs_signed_off_by_fkey references public.users,
    created_at    timestamp(6) with time zone default now()         not null,
    updated_at    timestamp(6) with time zone                       not null,
    constraint trip_jobs_trip_id_job_id_key unique (trip_id, job_id)
);

create index trip_jobs_job_id_idx on public.trip_jobs (job_id);

-- Every job is on one trip today, so its part there carries the job's own status, times and sign-off.
insert into public.trip_jobs (trip_id, job_id, status, departed_at, delivered_at, signed_off_at, signed_off_by,
                              updated_at)
select distinct th.trip_id,
                th.job_id,
                j.trip_status,
                j.departed_at,
                j.delivered_at,
                j.signed_off_at,
                j.signed_off_by,
                now()
from public.trip_horses th
         join public.transport_jobs j on j.id = th.job_id
where th.status <> 'MOVED';

-- The clearance gate holds each part's departure (application). A job that has departed can have a part still to
-- leave whose documents are re-checked for its new dates, so its dossier may lock again after departure.
alter table public.transport_jobs
    drop constraint transport_jobs_clearance_gate_check;

-- The ways horses leave a moving trip, an incident option's facts.
create type LeavingKind as enum ('UNLOAD', 'SECOND_VEHICLE', 'RETURN_TO_ORIGIN', 'LEAVE_IN_CARE');

alter table public.incident_options
    add column leaving_kind  LeavingKind,
    add column leaving_place varchar(200),
    add column vehicle_id    uuid
        constraint incident_options_vehicle_id_fkey references public.vehicles,
    add column customer_pays boolean default false not null,
    add constraint incident_options_leaving_check check (
        leaving_kind is null
            or (leaving_kind = 'SECOND_VEHICLE' and vehicle_id is not null)
            or (leaving_kind in ('UNLOAD', 'LEAVE_IN_CARE') and leaving_place is not null)
            or leaving_kind = 'RETURN_TO_ORIGIN');

-- The horses an option takes off the trip: the incident's job's horses, all or some.
create table public.incident_option_horses
(
    option_id uuid not null
        constraint incident_option_horses_option_id_fkey references public.incident_options on delete cascade,
    horse_id  uuid not null
        constraint incident_option_horses_horse_id_fkey references public.horses,
    primary key (option_id, horse_id)
);

-- The trip the leaving horses moved to.
alter table public.incidents
    add column new_trip_id uuid
        constraint incidents_new_trip_id_fkey references public.trips;

-- Another job pushed past its arrival window by a decision gets its own incident.
alter type IncidentKind add value 'LATE_ARRIVAL' after 'OTHER';
