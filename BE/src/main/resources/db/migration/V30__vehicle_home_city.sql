-- US-F7-03: a vehicle's location is a city, not only a country. A vehicle with no trip yet is in its home city; its
-- home country follows from that city's places.
--
-- Existing vehicles take the city most of their operating corridors in their home country start from (the first by
-- name on a tie), else the first city with a place in their home country; the coordinator corrects it.

alter table public.vehicles
    add column home_city varchar(80);

update public.vehicles v
set home_city = (select c.origin_city
                 from public.vehicle_corridors vc
                          join public.corridors c on c.id = vc.corridor_id
                 where vc.vehicle_id = v.id
                   and c.origin_country_id = v.home_country_id
                 group by c.origin_city
                 order by count(*) desc, c.origin_city
                 limit 1);

update public.vehicles v
set home_city = (select p.city
                 from public.places p
                 where p.country_id = v.home_country_id
                   and p.kind <> 'WELFARE_STOP'
                 order by p.created_at
                 limit 1)
where v.home_city is null;

do
$$
    begin
        if exists (select 1 from public.vehicles where home_city is null) then
            raise exception 'V30: a vehicle has no city in its home country; add a place there first';
        end if;
    end
$$;

alter table public.vehicles
    alter column home_city set not null;
