-- US-F3-15: jobs on one trip fly together on its flight, each with its own consignment. The flight keeps the airline,
-- flight number, aircraft and times, and how many stall positions it gives the trip; each job's air waybill, stall
-- positions and service class move to a flight allocation (docs/shared-trips-design.md, Shared flights).

create table public.flight_allocations
(
    id              uuid                        default uuidv7() not null primary key,
    flight_id       uuid                                         not null
        constraint flight_allocations_flight_id_fkey references public.flights on delete cascade,
    job_id          uuid                                         not null
        constraint flight_allocations_job_id_fkey references public.transport_jobs,
    air_waybill     varchar(20),
    stall_positions smallint
        constraint flight_allocations_stall_positions_check check (stall_positions > 0),
    service_class   ServiceClass,
    created_at      timestamp(6) with time zone default now()    not null,
    updated_at      timestamp(6) with time zone                  not null,
    constraint flight_allocations_flight_id_job_id_key unique (flight_id, job_id)
);

-- One consignment, one waybill: no two jobs on a flight share it.
create unique index flight_allocations_flight_id_air_waybill_uidx
    on public.flight_allocations (flight_id, air_waybill)
    where air_waybill is not null;
create index flight_allocations_job_id_idx on public.flight_allocations (job_id);

-- Every existing flight gets one allocation per job its route version picks up, carrying the flight's waybill, stall
-- positions and service class. Before this, a trip that flew carried one job, so that is one allocation per flight;
-- should a shared trip already fly, only its first job keeps the waybill.
insert into public.flight_allocations (flight_id, job_id, air_waybill, stall_positions, service_class, updated_at)
select f.id,
       s.job_id,
       case when row_number() over (partition by f.id order by min(s.seq)) = 1 then f.air_waybill end,
       f.stall_positions,
       f.service_class,
       now()
from public.flights f
         join public.route_legs l on l.id = f.route_leg_id
         join public.route_stops s on s.route_plan_id = l.route_plan_id
where s.kind = 'PICKUP'
  and s.job_id is not null
group by f.id, s.job_id, f.air_waybill, f.stall_positions, f.service_class;

alter table public.flights
    add column stall_capacity smallint
        constraint flights_stall_capacity_check check (stall_capacity > 0);

-- The positions a one-job flight had are what the airline gave the trip.
update public.flights
set stall_capacity = stall_positions
where stall_positions > 0;

alter table public.flights
    drop column air_waybill,
    drop column stall_positions,
    drop column service_class;

-- The crew rides a trailer or the trip's flight. Flight crew (flying grooms, the flight vet) have no trailer; every
-- row names its trip.
alter table public.crew_assignments
    add column trip_id uuid
        constraint crew_assignments_trip_id_fkey references public.trips on delete cascade;

update public.crew_assignments ca
set trip_id = tv.trip_id
from public.trip_vehicles tv
where tv.id = ca.trip_vehicle_id;

alter table public.crew_assignments
    alter column trip_id set not null,
    alter column trip_vehicle_id drop not null,
    add constraint crew_assignments_flight_crew_check
        check (trip_vehicle_id is not null or crew_role in ('FLYING_GROOM', 'VET'));

create unique index crew_assignments_trip_id_user_id_flight_uidx
    on public.crew_assignments (trip_id, user_id)
    where trip_vehicle_id is null;
create index crew_assignments_trip_id_idx on public.crew_assignments (trip_id);
