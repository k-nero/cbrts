-- V18__demo_customer_notes.sql: Seed customer notes for Transport Specialist (Domain K, §13)

do $$
declare
    v_user_customer uuid;
    v_user_lan uuid;
    v_club_saigon uuid;
    v_club_lao uuid;
    v_club_chao uuid;
    v_club_hanoi uuid;
    v_job_041 uuid := 'a0000000-0000-0000-0000-000000000041';
    v_check_item uuid;
begin
    -- Ensure roles exist
    insert into roles (id, name, description)
    values ('a0000000-0000-0000-0000-000000000001', 'CUSTOMER', 'Racing club or horse owner')
    on conflict (name) do nothing;

    insert into roles (id, name, description)
    values ('a0000000-0000-0000-0000-000000000003', 'TRANSPORT_SPECIALIST', 'Checks documents, files with authorities, keeps the catalogs')
    on conflict (name) do nothing;

    -- Ensure demo customer and specialist exist
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

    select id into v_user_lan from users where email = 'lan.nguyen@equifreight.vn';
    if v_user_lan is null then
        v_user_lan := 'a0000000-0000-0000-0000-000000000013';
        insert into users (id, email, first_name, last_name, staff_code, password, status)
        values (v_user_lan, 'lan.nguyen@equifreight.vn', 'Thị Lan', 'Nguyễn', 'EF-002', '$2a$10$wT3wF2J15P45zQ992/3kOu19xUqZ08a7nI9366N6b9/iVb9rWp97e', 'ACTIVE')
        on conflict (email) do update set email = excluded.email
        returning id into v_user_lan;

        insert into user_roles (user_id, role_id)
        select v_user_lan, id from roles where name = 'TRANSPORT_SPECIALIST'
        on conflict do nothing;
    end if;

    -- Ensure clubs exist
    select id into v_club_saigon from clubs where name = 'Saigon Turf Club' limit 1;
    if v_club_saigon is null then
        v_club_saigon := 'c0000000-0000-0000-0000-000000000001';
        insert into clubs (id, name, booking_email, country_code)
        values (v_club_saigon, 'Saigon Turf Club', 'bookings@saigonturf.vn', 'VN')
        on conflict do nothing;
    end if;

    select id into v_club_lao from clubs where name = 'Lao Turf Club' limit 1;
    if v_club_lao is null then
        v_club_lao := 'c0000000-0000-0000-0000-000000000002';
        insert into clubs (id, name, booking_email, country_code)
        values (v_club_lao, 'Lao Turf Club', 'racing@laoturf.la', 'LA')
        on conflict do nothing;
    end if;

    select id into v_club_chao from clubs where name = 'Chao Phraya Racing Stables' limit 1;
    if v_club_chao is null then
        v_club_chao := 'c0000000-0000-0000-0000-000000000003';
        insert into clubs (id, name, booking_email, country_code)
        values (v_club_chao, 'Chao Phraya Racing Stables', 'contact@chaophrayaracing.th', 'TH')
        on conflict do nothing;
    end if;

    select id into v_club_hanoi from clubs where name = 'Hanoi Riding Club' limit 1;
    if v_club_hanoi is null then
        v_club_hanoi := 'c0000000-0000-0000-0000-000000000004';
        insert into clubs (id, name, booking_email, country_code)
        values (v_club_hanoi, 'Hanoi Riding Club', 'admin@hanoiriding.vn', 'VN')
        on conflict do nothing;
    end if;

    -- Find transit insurance checklist item for job 041 if exists
    select id into v_check_item from checklist_items where job_id = v_job_041 limit 1;

    -- 1. Saigon Turf Club · CBRT-2026-041
    if not exists (select 1 from notes where subject = 'Transit insurance: the extension is issued a day late') then
        insert into notes (
            id, club_id, job_id, checklist_item_id, topic, routed_role,
            subject, body, created_by, reply_due_at, status, created_at
        ) values (
            'eb000000-0000-0000-0000-000000000001',
            v_club_saigon,
            v_job_041,
            v_check_item,
            'DOCUMENTS',
            'TRANSPORT_SPECIALIST',
            'Transit insurance: the extension is issued a day late',
            'Our broker says the transit insurance extension can only be issued on 1 Oct, because their underwriter needs the final route sign-off. Can we still make the 14 Oct clearance deadline?',
            v_user_customer,
            now() + interval '4 hours',
            'OPEN',
            now() - interval '1 day'
        );
    end if;

    -- 2. Lao Turf Club · CBRT-2026-044
    if not exists (select 1 from notes where subject = 'Can the first lab do the second EIA test?') then
        insert into notes (
            id, club_id, job_id, topic, routed_role,
            subject, body, created_by, reply_due_at, status, created_at
        ) values (
            'eb000000-0000-0000-0000-000000000002',
            v_club_lao,
            v_job_041,
            'DOCUMENTS',
            'TRANSPORT_SPECIALIST',
            'Can the first lab do the second EIA test?',
            'The laboratory in Vientiane tested the first Coggins sample. Can they also process the second test 14 days before departure, or must it be sent to Bangkok?',
            v_user_customer,
            now() + interval '6 hours',
            'OPEN',
            now() - interval '18 hours'
        );
    end if;

    -- 3. Chao Phraya Racing Stables · CBRT-2026-036
    if not exists (select 1 from notes where subject = 'A copy of the health certificates for our records') then
        insert into notes (
            id, club_id, job_id, topic, routed_role,
            subject, body, created_by, reply_due_at, status, created_at
        ) values (
            'eb000000-0000-0000-0000-000000000003',
            v_club_chao,
            v_job_041,
            'DOCUMENTS',
            'TRANSPORT_SPECIALIST',
            'A copy of the health certificates for our records',
            'Could you forward the validated export health certificate copies as soon as RAHO6 issues them? Our customs broker in Bangkok requests a preview.',
            v_user_customer,
            now() + interval '26 hours',
            'OPEN',
            now() - interval '8 hours'
        );
    end if;

    -- 4. Hanoi Riding Club · REQ-2026-0190
    if not exists (select 1 from notes where subject = 'Does Laos need its own EIA test?') then
        insert into notes (
            id, club_id, job_id, topic, routed_role,
            subject, body, created_by, reply_due_at, status, created_at
        ) values (
            'eb000000-0000-0000-0000-000000000004',
            v_club_hanoi,
            v_job_041,
            'DOCUMENTS',
            'TRANSPORT_SPECIALIST',
            'Does Laos need its own EIA test?',
            'For transit through Laos into Thailand, do Lao veterinary authorities require their own separate EIA certificate or does the Vietnamese pre-export certificate suffice?',
            v_user_customer,
            now() + interval '28 hours',
            'OPEN',
            now() - interval '5 hours'
        );
    end if;

end $$;
