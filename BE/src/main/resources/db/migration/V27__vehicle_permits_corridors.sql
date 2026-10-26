-- US-F3-19: a vehicle's home country, the countries it holds permits for and the road corridors it works, and the two
-- countries of every corridor. A vehicle joins a road trip only on one of its corridors, from the country the trip
-- starts in; where it is comes from its bookings, so it needs no column.
--
-- Existing vehicles are based in Vietnam, hold permits for every other country and work every road corridor, so
-- planning behaves as before until staff narrow them.

-- The two countries of a corridor.
alter table public.corridors
    add column origin_country_id      uuid
        constraint corridors_origin_country_id_fkey references public.countries,
    add column destination_country_id uuid
        constraint corridors_destination_country_id_fkey references public.countries;

-- A corridor with crossings starts where its first crossing leaves and ends where its last one enters.
update public.corridors c
set origin_country_id      = (select bc.from_country_id
                              from public.corridor_crossings cc
                                       join public.border_crossings bc on bc.id = cc.border_crossing_id
                              where cc.corridor_id = c.id
                              order by cc.seq
                              limit 1),
    destination_country_id = (select bc.to_country_id
                              from public.corridor_crossings cc
                                       join public.border_crossings bc on bc.id = cc.border_crossing_id
                              where cc.corridor_id = c.id
                              order by cc.seq desc
                              limit 1)
where exists (select 1 from public.corridor_crossings cc where cc.corridor_id = c.id);

-- The rest take each end's country from the places in that city, as CorridorService does for a new route. A road
-- corridor whose destination has no place yet (RD HKG -> Sha Tin) crosses no border, so it ends where it starts.
update public.corridors c
set origin_country_id = (select p.country_id
                         from public.places p
                         where lower(p.city) = lower(c.origin_city)
                           and p.kind <> 'WELFARE_STOP'
                         order by p.created_at
                         limit 1)
where c.origin_country_id is null;

update public.corridors c
set destination_country_id = coalesce(
        (select p.country_id
         from public.places p
         where lower(p.city) = lower(c.destination_city)
           and p.kind <> 'WELFARE_STOP'
         order by p.created_at
         limit 1),
        case when c.mode = 'ROAD' then c.origin_country_id end)
where c.destination_country_id is null;

do
$$
    begin
        if exists (select 1
                   from public.corridors
                   where origin_country_id is null
                      or destination_country_id is null) then
            raise exception 'V27: a corridor has no country for one of its ends; add a place in its city first';
        end if;
    end
$$;

alter table public.corridors
    alter column origin_country_id set not null,
    alter column destination_country_id set not null;

-- Where a vehicle is based. Existing vehicles are Vietnamese.
alter table public.vehicles
    add column home_country_id uuid
        constraint vehicles_home_country_id_fkey references public.countries;

update public.vehicles
set home_country_id = (select id from public.countries where code = 'VN');

alter table public.vehicles
    alter column home_country_id set not null;

-- The foreign countries a vehicle holds a permit for; its home country is never listed.
create table public.vehicle_countries
(
    vehicle_id uuid not null
        constraint vehicle_countries_vehicle_id_fkey references public.vehicles on delete cascade,
    country_id uuid not null
        constraint vehicle_countries_country_id_fkey references public.countries,
    primary key (vehicle_id, country_id)
);

insert into public.vehicle_countries (vehicle_id, country_id)
select v.id, c.id
from public.vehicles v
         cross join public.countries c
where c.id <> v.home_country_id;

-- The road corridors a vehicle works. A corridor is added only when the vehicle holds a permit for every country on
-- it (VehicleService); air corridors are never listed, since no vehicle flies.
create table public.vehicle_corridors
(
    vehicle_id  uuid not null
        constraint vehicle_corridors_vehicle_id_fkey references public.vehicles on delete cascade,
    corridor_id uuid not null
        constraint vehicle_corridors_corridor_id_fkey references public.corridors,
    primary key (vehicle_id, corridor_id)
);

create index vehicle_corridors_corridor_id_idx on public.vehicle_corridors (corridor_id);

insert into public.vehicle_corridors (vehicle_id, corridor_id)
select v.id, c.id
from public.vehicles v
         cross join public.corridors c
where c.mode = 'ROAD';
