-- US-F5-02: the coordinator records the options for handling an incident, each with its estimated extra cost (in the
-- job's quotation currency) and the delay it adds to the arrival, and whether it changes the route; then proposes
-- one for the logistics manager to approve.
alter table public.incident_options
    add column extra_cost    numeric(14, 2) default 0     not null
        constraint incident_options_extra_cost_check check (extra_cost >= 0),
    add column delay_minutes integer        default 0     not null
        constraint incident_options_delay_minutes_check check (delay_minutes >= 0),
    add column changes_route boolean        default false not null,
    add column created_by    uuid
        constraint incident_options_created_by_fkey references public.users;

alter table public.incidents
    add column proposed_option_id uuid
        constraint incidents_proposed_option_id_fkey references public.incident_options,
    add column proposed_by        uuid
        constraint incidents_proposed_by_fkey references public.users,
    add column proposed_at        timestamp(6) with time zone,
    add column proposal_note      varchar(1000);

-- The owner hears that a proposal waits for their decision.
alter type NotificationKind add value 'INCIDENT_PROPOSAL' after 'INCIDENT_RAISED';
