-- US-F6-04: the logistics manager closes a delivered job once the handover is recorded and no incident is open. The
-- job keeps whether it was delivered on time: minutes after the arrival window closed (less a stopped clock), or,
-- without a window, after its planned arrival.
alter table public.transport_jobs
    add column closed_by    uuid
        constraint transport_jobs_closed_by_fkey references public.users,
    add column on_time      boolean,
    add column late_minutes integer,
    add constraint transport_jobs_closed_check check (
        stage <> 'CLOSED' or (closed_at is not null and closed_by is not null and on_time is not null));
