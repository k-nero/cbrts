-- US-F5-04: the coordinator sends a delay alert for traffic, bad weather or border congestion with a new arrival time.
-- An alert opens an incident of that kind (a prolonged traffic jam is TRAFFIC), moves the trip's stops still ahead,
-- and tells the crew and every customer on the trip. eta_at is the arrival the latest alert announced.
alter type IncidentKind add value 'WEATHER' after 'LATE_ARRIVAL';
alter type IncidentKind add value 'BORDER_CONGESTION' after 'WEATHER';

alter table public.incidents
    add column eta_at timestamp(6) with time zone;

-- US-F5-05: the logistics manager closes an incident with its resolution and a closing note, both required.
alter table public.incidents
    add column resolution   varchar(300),
    add column closing_note varchar(1000),
    add column resolved_by  uuid
        constraint incidents_resolved_by_fkey references public.users,
    add constraint incidents_resolution_check check (
        status <> 'RESOLVED'
            or (resolution is not null and closing_note is not null and resolved_at is not null
            and resolved_by is not null));

alter type NotificationKind add value 'DELAY_ALERT' after 'INCIDENT_UPDATE';
alter type NotificationKind add value 'INCIDENT_RESOLVED' after 'DELAY_ALERT';
