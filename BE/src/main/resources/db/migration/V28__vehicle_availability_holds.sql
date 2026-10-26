-- US-F7-02: a vehicle's availability over time. Each road corridor has its driving days, a vehicle can carry a date
-- it is expected back on, the rate catalog gains the turnaround after a trip, and an accepted request holds a vehicle
-- (a RESERVED booking for the request). The new enum values aren't used here: V29 adds the check that uses RESERVED,
-- in its own transaction.

alter type BookingKind add value 'RESERVED';
alter type RatePolicyKey add value 'TURNAROUND_HOURS';

-- How many days the corridor takes to drive, one way: a trip's length before its route is planned, and how long an
-- empty drive back takes. Filled from the distance at 500 km a day; the fleet & route coordinator corrects it.
alter table public.corridors
    add column driving_days smallint not null default 1
        constraint corridors_driving_days_check check (driving_days between 1 and 30);

update public.corridors
set driving_days = least(30, greatest(1, ceil(coalesce(distance_km, 0) / 500.0)))::smallint;

-- The date the coordinator expects the vehicle back, for what the calendar doesn't know (repairs, a delay abroad).
-- It counts only while it is later than the date worked out from the bookings.
alter table public.vehicles
    add column available_on date;

-- The request a RESERVED booking holds a vehicle for, from the customer's acceptance until the trip's load plan is
-- confirmed (it becomes the trip's JOB booking) or the request is rejected or cancelled.
alter table public.vehicle_bookings
    add column request_id uuid
        constraint vehicle_bookings_request_id_fkey references public.transport_requests on delete cascade;

create index vehicle_bookings_request_id_idx on public.vehicle_bookings (request_id);
