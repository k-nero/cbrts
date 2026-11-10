-- US-F5-07 and US-F5-08 (docs/compensation-design.md): the logistics manager can compensate the customer when closing
-- an incident, credited on the job's final invoice, and record an insurance claim on an incident of a job insured with
-- EquiFreight.

-- What EquiFreight gives back for the incident, and why, in the customer's words. Both or neither.
alter table public.incidents
    add column compensation_amount numeric(14, 2),
    add column compensation_reason varchar(300),
    add constraint incidents_compensation_check check (
        (compensation_amount is null and compensation_reason is null)
            or (compensation_amount > 0 and compensation_reason is not null));

alter type InvoiceLineKind add value 'COMPENSATION_CREDIT' after 'LATE_PENALTY_CREDIT';

create type InsuranceClaimStatus as enum ('FILED', 'SETTLED', 'DECLINED');

-- One claim per incident. The insurer pays the owner directly: the claim records what was claimed and paid.
create table public.insurance_claims
(
    id             uuid                     default uuidv7() not null primary key,
    incident_id    uuid                                      not null
        constraint insurance_claims_incident_id_key unique
        constraint insurance_claims_incident_id_fkey references public.incidents,
    insurer        varchar(120)                              not null,
    reference      varchar(60)                               not null,
    claimed_amount numeric(14, 2)                            not null
        constraint insurance_claims_claimed_amount_check check (claimed_amount > 0),
    note           varchar(500),
    status         InsuranceClaimStatus                      not null,
    settled_amount numeric(14, 2),
    decline_reason varchar(300),
    filed_by       uuid                                      not null
        constraint insurance_claims_filed_by_fkey references public.users,
    filed_at       timestamp(6) with time zone               not null,
    closed_by      uuid
        constraint insurance_claims_closed_by_fkey references public.users,
    closed_at      timestamp(6) with time zone,
    created_at     timestamp(6) with time zone default now() not null,
    updated_at     timestamp(6) with time zone               not null,
    constraint insurance_claims_outcome_check check (
        (status = 'FILED' and settled_amount is null and decline_reason is null and closed_at is null)
            or (status = 'SETTLED' and settled_amount > 0 and settled_amount <= claimed_amount
                and decline_reason is null and closed_at is not null and closed_by is not null)
            or (status = 'DECLINED' and settled_amount is null and decline_reason is not null
                and closed_at is not null and closed_by is not null))
);
