-- US-F5-03: the logistics manager approves the proposed option, or sends it back. Approval may give the trip a new
-- route version, re-runs the document check when dates move, and attaches the extra cost to the job for the final
-- invoice when the customer pays it. The customer gets the manager's message as written.
alter table public.incidents
    add column customer_message varchar(1000),
    add column charge_customer  boolean,
    add column route_plan_id    uuid
        constraint incidents_route_plan_id_fkey references public.route_plans;

-- A cost the final invoice adds to the job, beyond the quotation: an approved incident option the customer pays. The
-- final invoice turns each into an ADJUSTMENT line; until then it is only recorded here.
create table public.job_charges
(
    id          uuid                     default uuidv7() not null primary key,
    job_id      uuid                                      not null
        constraint job_charges_job_id_fkey references public.transport_jobs,
    incident_id uuid
        constraint job_charges_incident_id_fkey references public.incidents,
    description varchar(300)                              not null,
    amount      numeric(14, 2)                            not null
        constraint job_charges_amount_check check (amount > 0),
    created_by  uuid                                      not null
        constraint job_charges_created_by_fkey references public.users,
    created_at  timestamp(6) with time zone default now() not null,
    updated_at  timestamp(6) with time zone               not null
);

create index job_charges_job_id_idx on public.job_charges (job_id);
create unique index job_charges_incident_id_uidx on public.job_charges (incident_id) where incident_id is not null;

alter type NotificationKind add value 'INCIDENT_DECIDED' after 'INCIDENT_PROPOSAL';
alter type NotificationKind add value 'INCIDENT_RETURNED' after 'INCIDENT_DECIDED';
alter type NotificationKind add value 'INCIDENT_UPDATE' after 'INCIDENT_RETURNED';
