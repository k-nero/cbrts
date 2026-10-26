-- US-F7-02: a RESERVED booking holds a vehicle for a request, and only a RESERVED one names a request. Kept apart
-- from V28, which added the RESERVED value: Postgres can't use a new enum value in the transaction that added it.

alter table public.vehicle_bookings
    add constraint vehicle_bookings_request_check check ((kind = 'RESERVED') = (request_id is not null));
