-- US-F5-01: the escort reports an emergency from the cab. The kinds the cab offers are a vehicle breakdown
-- (VEHICLE), a prolonged traffic jam, a horse medical incident (WELFARE) and anything else; the report keeps where
-- it happened, which horse it concerns (a medical incident names one), who reported it, and the tablet's own
-- reference so a resend after a lost connection doesn't open a second incident.
alter type IncidentKind add value 'TRAFFIC' after 'VEHICLE';
alter type IncidentKind add value 'OTHER' after 'TRAFFIC';

alter table public.incidents
    add column location    varchar(200),
    add column horse_id    uuid
        constraint incidents_horse_id_fkey references public.horses,
    add column reported_by uuid
        constraint incidents_reported_by_fkey references public.users,
    add column client_ref  uuid;

create unique index incidents_client_ref_uidx on public.incidents (client_ref) where client_ref is not null;

-- The owner and the job's coordinator are alerted at once; the notification opens the incident.
alter type NotificationKind add value 'INCIDENT_RAISED' after 'JOB_REPLANNED';
alter type NotificationSubject add value 'INCIDENT' after 'TRIP_TRACKING';
