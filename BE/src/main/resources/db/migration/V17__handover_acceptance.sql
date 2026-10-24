-- US-F6-02: the customer accepts the handover or raises a discrepancy with a description, within 2 days; with no
-- answer by then, and no incident open on the job, the handover is taken as accepted. A discrepancy opens an incident
-- (CUSTOMER_REPORT) for the logistics manager, who resolves it like any other.
alter table public.handovers
    add column discrepancy          varchar(1000),
    add column discrepancy_incident uuid
        constraint handovers_discrepancy_incident_fkey references public.incidents,
    add column accepted_by_default  boolean default false not null,
    add constraint handovers_outcome_check check (
        customer_outcome is null
            or (confirmed_at is not null
            and (customer_outcome <> 'PROBLEM_REPORTED' or discrepancy is not null)));

alter type NotificationKind add value 'HANDOVER_ACCEPTED' after 'INCIDENT_RESOLVED';
