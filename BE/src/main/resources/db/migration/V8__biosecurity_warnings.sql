-- Biosecurity warnings on shared trips (US-F3-12, docs/shared-trips-design.md "Health status"). Health status is
-- derived from each job's clearance, so document types say which of them are about the horse's health.

create type DocumentCategory as enum ('HEALTH', 'IDENTITY', 'PERMIT', 'TRANSPORT');

alter table document_types
    add column category DocumentCategory;

update document_types
set category = case
                   when code in ('INFLUENZA_VACCINATION', 'EIA_TEST', 'PIROPLASMOSIS_TEST', 'EXPORT_HEALTH_CERT')
                       then 'HEALTH'
                   when code in ('EQUINE_PASSPORT', 'PROOF_OF_OWNERSHIP') then 'IDENTITY'
                   when code in ('IMPORT_PERMIT') then 'PERMIT'
                   else 'TRANSPORT' end::DocumentCategory;

alter table document_types
    alter column category set not null;

-- A biosecurity warning the coordinator accepted for a trip. The key is derived from the warning's content (the
-- jobs, the horses and what differs), so an unchanged warning isn't asked twice, and one that changed (a document
-- expired, quarantine moved) has a new key and is asked again. Who accepted it is also in the audit log.
create table public.trip_warning_acceptances
(
    accepted_at timestamp(6) with time zone default now()    not null,
    created_at  timestamp(6) with time zone default now()    not null,
    updated_at  timestamp(6) with time zone                  not null,
    id          uuid                        default uuidv7() not null
        primary key,
    trip_id     uuid                                         not null
        constraint trip_warning_acceptances_trip_id_fkey
            references public.trips on delete cascade,
    accepted_by uuid                                         not null
        constraint trip_warning_acceptances_accepted_by_fkey
            references public.users,
    warning_key varchar(32)                                  not null,
    summary     varchar(500)                                 not null,
    unique (trip_id, warning_key)
);
