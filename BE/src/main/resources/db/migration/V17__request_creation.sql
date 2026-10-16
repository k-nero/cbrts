-- Flow 1 request creation (US-F1-01, US-F1-02); docs/database/database-design.md §7, §8.

-- BR-F1-01: lead_time_days is the cross-border lead time into the country; a move within it needs this.
alter table regulation_versions add column domestic_lead_time_days smallint not null default 3;

-- A draft starts on the Horses step: no code (issued at submission) and no date yet.
alter table transport_requests alter column code drop not null;
alter table transport_requests alter column departure_date drop not null;

-- What the customer typed when it matches no place ("Singapore"), kept so the ask is visible.
alter table transport_requests add column origin_text varchar(160);
alter table transport_requests add column destination_text varchar(160);

-- Rows written before these checks (Flow 3's seeded REQ-2026-0193) were submitted without a time; the
-- creation time stands in, so the checks below hold for them.
update transport_requests set submitted_at = created_at
where submitted_at is null and status not in ('DRAFT', 'CANCELLED');

alter table transport_requests
    -- A request has a code exactly when it has been submitted.
    add constraint transport_requests_code_check check ((code is null) = (submitted_at is null)),
    -- Every status after DRAFT comes from a submission; CANCELLED may also end a never-submitted draft.
    add constraint transport_requests_submitted_check
        check (status in ('DRAFT', 'CANCELLED') or submitted_at is not null),
    -- Routes we run: a request without a corridor exists only as a draft.
    add constraint transport_requests_route_check
        check (submitted_at is null or (corridor_id is not null and departure_date is not null)),
    -- Each end is a place or a typed city, never both.
    add constraint transport_requests_origin_check check (origin_place_id is null or origin_text is null),
    add constraint transport_requests_destination_check
        check (destination_place_id is null or destination_text is null);

-- "Mare with foal at foot" belongs to one trip, so it lives on the request's horse.
alter table request_horses add column with_foal boolean not null default false;
alter table request_horses add constraint request_horses_with_foal_check check (not with_foal or sex = 'MARE');
