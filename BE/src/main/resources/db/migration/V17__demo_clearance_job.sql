-- V16__demo_clearance_job.sql: Demo data for Flow 2 clearance testing (CBRT-2026-041).

do $$
declare
    v_user_yen uuid;
    v_user_customer uuid;
    v_club_id uuid := 'c0000000-0000-0000-0000-000000000001';
    v_rate_version_id uuid := 'd0000000-0000-0000-0000-000000000001';
    v_request_id uuid := 'e0000000-0000-0000-0000-000000000001';
    v_quotation_id uuid := 'f0000000-0000-0000-0000-000000000001';
    v_job_id uuid := 'a0000000-0000-0000-0000-000000000041';
    v_doc_passport uuid;
    v_doc_flu uuid;
    v_doc_eia uuid;
    v_doc_ownership uuid;
    v_doc_insurance uuid;
begin
    -- 1. Ensure roles and users exist (Yen and Customer)
    insert into roles (id, name, description)
    values ('a0000000-0000-0000-0000-000000000002', 'LOGISTICS_MANAGER', 'Reviews requests, issues quotations, owns escalations')
    on conflict (name) do nothing;

    insert into roles (id, name, description)
    values ('a0000000-0000-0000-0000-000000000001', 'CUSTOMER', 'Racing club or horse owner')
    on conflict (name) do nothing;

    select id into v_user_yen from users where email = 'yen.vu@equifreight.vn';
    if v_user_yen is null then
        v_user_yen := 'a0000000-0000-0000-0000-000000000012';
        insert into users (id, email, first_name, last_name, staff_code, password, status)
        values (v_user_yen, 'yen.vu@equifreight.vn', 'Hải Yến', 'Vũ', 'EF-001', '$2a$10$wT3wF2J15P45zQ992/3kOu19xUqZ08a7nI9366N6b9/iVb9rWp97e', 'ACTIVE')
        on conflict (email) do update set email = excluded.email
        returning id into v_user_yen;

        insert into user_roles (user_id, role_id)
        select v_user_yen, id from roles where name = 'LOGISTICS_MANAGER'
        on conflict do nothing;
    end if;

    select id into v_user_customer from users where email = 'bookings@saigonturf.vn';
    if v_user_customer is null then
        v_user_customer := 'a0000000-0000-0000-0000-000000000011';
        insert into users (id, email, first_name, last_name, password, status)
        values (v_user_customer, 'bookings@saigonturf.vn', 'Saigon Turf', 'Club', '$2a$10$wT3wF2J15P45zQ992/3kOu19xUqZ08a7nI9366N6b9/iVb9rWp97e', 'ACTIVE')
        on conflict (email) do update set email = excluded.email
        returning id into v_user_customer;

        insert into user_roles (user_id, role_id)
        select v_user_customer, id from roles where name = 'CUSTOMER'
        on conflict do nothing;
    end if;

    -- 2. Insert Saigon Turf Club if not exists
    if not exists (select 1 from clubs where id = v_club_id or name = 'Saigon Turf Club') then
        insert into clubs (id, name, booking_email, country_code)
        values (v_club_id, 'Saigon Turf Club', 'bookings@saigonturf.vn', 'VN');
    else
        select id into v_club_id from clubs where name = 'Saigon Turf Club' limit 1;
    end if;

    -- 3. Insert Baseline Rate Catalog Version if not exists
    if not exists (select 1 from rate_catalog_versions where version_no = 1) then
        insert into rate_catalog_versions (id, version_no, status, published_at, published_by, change_note)
        values (v_rate_version_id, 1, 'PUBLISHED', now(), v_user_yen, 'Baseline rate catalog v1');
    else
        select id into v_rate_version_id from rate_catalog_versions where version_no = 1 limit 1;
    end if;

    -- 4. Insert Transport Request REQ-2026-0162
    if not exists (select 1 from transport_requests where code = 'REQ-2026-0162') then
        insert into transport_requests (id, code, club_id, created_by, status, mode, trailer, departure_date,
                                        date_flex_days, arrival_mode, estimate_low, estimate_high, submitted_at)
        values (v_request_id, 'REQ-2026-0162', v_club_id, v_user_customer, 'APPROVED', 'ROAD', 'PRIVATE',
                '2026-10-18', 0, 'ANY_TIME', 3800.00, 4500.00, now());
    else
        select id into v_request_id from transport_requests where code = 'REQ-2026-0162' limit 1;
    end if;

    -- 5. Insert Quotation Q-2026-0175
    if not exists (select 1 from quotations where code = 'Q-2026-0175') then
        insert into quotations (id, code, request_id, version_no, status, rate_catalog_version_id, currency,
                                prepared_by, issued_at, subtotal, total, accepted_at, accepted_by)
        values (v_quotation_id, 'Q-2026-0175', v_request_id, 1, 'ACCEPTED', v_rate_version_id, 'USD',
                v_user_yen, now(), 4200.00, 4200.00, now(), v_user_customer);
    else
        select id into v_quotation_id from quotations where code = 'Q-2026-0175' limit 1;
    end if;

    -- 6. Insert Canonical Job CBRT-2026-041
    if not exists (select 1 from transport_jobs where code = 'CBRT-2026-041') then
        insert into transport_jobs (id, code, request_id, quotation_id, approved_by, approved_at, stage,
                                    dossier_status, trip_status, planned_departure_at, planned_arrival_at)
        values (v_job_id, 'CBRT-2026-041', v_request_id, v_quotation_id, v_user_yen, now(), 'DOCUMENTS',
                'OPEN', 'NOT_STARTED', '2026-10-18 06:00:00+07', '2026-10-18 12:30:00+07');
    else
        select id into v_job_id from transport_jobs where code = 'CBRT-2026-041' limit 1;
    end if;

    -- 7. Document Types IDs
    select id into v_doc_eia from document_types where code = 'EIA_TEST';
    select id into v_doc_flu from document_types where code = 'INFLUENZA_VACCINATION';
    select id into v_doc_passport from document_types where code = 'EQUINE_PASSPORT';
    select id into v_doc_ownership from document_types where code = 'PROOF_OF_OWNERSHIP';
    select id into v_doc_insurance from document_types where code = 'TRANSIT_INSURANCE';

    -- 8. Seed Checklist Items for CBRT-2026-041
    if v_doc_eia is not null and not exists (select 1 from checklist_items where job_id = v_job_id and document_type_id = v_doc_eia) then
        insert into checklist_items (id, job_id, document_type_id, status, validity, validity_note, holder, due_date)
        values (gen_random_uuid(), v_job_id, v_doc_eia, 'AWAITING_UPLOAD', 'RED', 'Valid today, but 77 days old at departure (limit 60 days).', 'CUSTOMER', '2026-10-04');
    end if;

    if v_doc_ownership is not null and not exists (select 1 from checklist_items where job_id = v_job_id and document_type_id = v_doc_ownership) then
        insert into checklist_items (id, job_id, document_type_id, status, validity, validity_note, holder, due_date)
        values (gen_random_uuid(), v_job_id, v_doc_ownership, 'REJECTED', 'RED', 'Rejected 24 Sep by Lan: bill of sale is unsigned. Upload signed copy.', 'CUSTOMER', '2026-09-25');
    end if;

    if v_doc_insurance is not null and not exists (select 1 from checklist_items where job_id = v_job_id and document_type_id = v_doc_insurance) then
        insert into checklist_items (id, job_id, document_type_id, status, validity, validity_note, holder, due_date)
        values (gen_random_uuid(), v_job_id, v_doc_insurance, 'AWAITING_UPLOAD', 'AMBER', 'Policy ends 15 Oct, before arrival plus 2 days (20 Oct).', 'CUSTOMER', '2026-09-30');
    end if;

    if v_doc_flu is not null and not exists (select 1 from checklist_items where job_id = v_job_id and document_type_id = v_doc_flu) then
        insert into checklist_items (id, job_id, document_type_id, status, validity, validity_note, holder, due_date)
        values (gen_random_uuid(), v_job_id, v_doc_flu, 'AWAITING_UPLOAD', 'RED', 'Booster lapsed on 16 Sep. Give new booster at least 7 days before departure.', 'CUSTOMER', '2026-10-11');
    end if;

    if v_doc_passport is not null and not exists (select 1 from checklist_items where job_id = v_job_id and document_type_id = v_doc_passport) then
        insert into checklist_items (id, job_id, document_type_id, status, validity, validity_note, holder, due_date)
        values (gen_random_uuid(), v_job_id, v_doc_passport, 'IN_REVIEW', 'GREEN', 'Passport uploaded and valid. Awaiting specialist verification.', 'SPECIALIST', '2026-10-15');
    end if;

end $$;
