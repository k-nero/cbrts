-- US-F3-16: a job planned as a chain of trips (docs/multi-trip-jobs-design.md).

-- A job's part on one trip continues as its part on the next trip of the chain. Two parts can hand on to the same
-- next part: an incident that moves some horses off a trip keeps them on the journey, and they join the others there.
alter table public.trip_jobs
    add column next_trip_job_id uuid
        constraint trip_jobs_next_trip_job_id_fkey references public.trip_jobs on delete set null,
    add constraint trip_jobs_next_check check (next_trip_job_id <> id);
create index trip_jobs_next_trip_job_id_idx on public.trip_jobs (next_trip_job_id);

-- A transfer names its job, like a pickup or a delivery.
alter table public.route_stops
    drop constraint route_stops_job_check,
    add constraint route_stops_job_check
        check ((kind in ('PICKUP', 'DELIVERY', 'TRANSFER')) = (job_id is not null));
