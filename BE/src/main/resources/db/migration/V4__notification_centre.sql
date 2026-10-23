-- Notification centre (US-00-07): typed kinds and subjects, the record's code for the row, the page each recipient
-- opens it on, and a key that keeps a repeated notice to one unread row.

create type NotificationKind as enum (
    'REQUEST_INFO_REQUIRED',
    'REQUEST_CANCELLED',
    'REQUEST_REJECTED',
    'REQUEST_APPROVED',
    'QUOTATION_ISSUED',
    'QUOTATION_EXPIRING',
    'QUOTATION_EXPIRED',
    'QUOTATION_ACCEPTED',
    'QUOTATION_DECLINED',
    'JOB_ASSIGNED',
    'AUTHORITY_INFO_REQUIRED',
    'DOSSIER_BLOCKED',
    'DOSSIER_REFUSED',
    'DOSSIER_LATE',
    'TRIP_RELEASED',
    'TRIP_HELD'
    );

create type NotificationSubject as enum (
    'TRANSPORT_REQUEST',
    'QUOTATION',
    'TRANSPORT_JOB',
    'AUTHORITY_SUBMISSION'
    );

-- Rows written before the catalog existed. The authority's request for more information takes its catalog name.
-- A notification is a pointer, not evidence, so a row whose kind or record can't be typed is dropped.
update public.notifications
set kind = 'AUTHORITY_INFO_REQUIRED'
where kind = 'ADDITIONAL_INFO_REQUIRED';

update public.notifications
set entity_type = 'AUTHORITY_SUBMISSION'
where entity_type = 'AuthoritySubmission';

delete
from public.notifications
where entity_id is null
   or kind not in (select unnest(enum_range(null::NotificationKind))::text)
   or entity_type is null
   or entity_type not in (select unnest(enum_range(null::NotificationSubject))::text);

alter table public.notifications
    alter column kind type NotificationKind using kind::NotificationKind,
    alter column entity_type type NotificationSubject using entity_type::NotificationSubject,
    add column entity_code varchar(20),
    add column link_path   varchar(200),
    add column dedupe_key  varchar(120);

-- Backfill the code and the link the same way NotificationService.linkFor resolves them: customers open their
-- request, escorts the cab surface, staff the staff pages.
update public.notifications n
set entity_code = r.code,
    link_path   = case
                      when u.club_id is not null then '/requests/' || r.id || '/submitted'
                      else '/staff/requests/' || r.id
        end
from public.transport_requests r,
     public.users u
where n.entity_type = 'TRANSPORT_REQUEST'
  and r.id = n.entity_id
  and u.id = n.user_id;

update public.notifications n
set entity_code = j.code,
    link_path   = case
                      when u.club_id is not null then '/requests/' || j.request_id || '/submitted'
                      when exists (select 1
                                   from public.user_roles ur
                                            join public.roles ro on ro.id = ur.role_id
                                   where ur.user_id = u.id
                                     and ro.name = 'ESCORT') then '/escort'
                      else '/staff/jobs/' || j.id
        end
from public.transport_jobs j,
     public.users u
where n.entity_type = 'TRANSPORT_JOB'
  and j.id = n.entity_id
  and u.id = n.user_id;

update public.notifications n
set entity_code = j.code,
    link_path   = case
                      when u.club_id is not null then '/requests/' || j.request_id || '/submitted'
                      else '/staff/jobs/' || j.id || '?tab=authorities'
        end
from public.authority_submissions s,
     public.transport_jobs j,
     public.users u
where n.entity_type = 'AUTHORITY_SUBMISSION'
  and s.id = n.entity_id
  and j.id = s.job_id
  and u.id = n.user_id;

-- Every notification links to its record (US-00-07); one whose record is gone has nothing to open.
delete
from public.notifications
where link_path is null;

alter table public.notifications
    alter column entity_type set not null,
    alter column entity_id set not null,
    alter column entity_code set not null,
    alter column link_path set not null;

-- One unread row per person and notice: a repeat bumps it instead of stacking (NotificationRepository.upsert).
create unique index notifications_user_id_dedupe_key_uidx
    on public.notifications (user_id, dedupe_key)
    where read_at is null and dedupe_key is not null;
