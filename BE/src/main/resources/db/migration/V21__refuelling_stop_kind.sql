-- Add REFUELLING stop kind to route_stops for refuelling stops (US-F3-03)
alter table route_stops drop constraint if exists route_stops_kind_check;
alter table route_stops add constraint route_stops_kind_check
    check (kind in ('PICKUP', 'BORDER', 'WELFARE', 'DELIVERY', 'AIRPORT_OUT', 'AIRPORT_IN', 'QUARANTINE', 'REFUELLING'));
