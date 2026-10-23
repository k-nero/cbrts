-- Approval assigns the job's team (US-F1-07): the transport specialist who owns its documents and clearance, and
-- the fleet & route coordinator who plans it. Jobs approved before this have neither, so the columns allow null.
alter table public.transport_jobs
    add column transport_specialist_id uuid
        constraint transport_jobs_transport_specialist_id_fkey
            references public.users,
    add column coordinator_id uuid
        constraint transport_jobs_coordinator_id_fkey
            references public.users;

create index transport_jobs_transport_specialist_id_idx on public.transport_jobs (transport_specialist_id);
create index transport_jobs_coordinator_id_idx on public.transport_jobs (coordinator_id);

create trigger transport_jobs_transport_specialist_role
    before insert or
        update of transport_specialist_id
    on public.transport_jobs
    for each row
execute function public.require_role('transport_specialist_id', 'TRANSPORT_SPECIALIST');

create trigger transport_jobs_coordinator_role
    before insert or
        update of coordinator_id
    on public.transport_jobs
    for each row
execute function public.require_role('coordinator_id', 'FLEET_COORDINATOR');
