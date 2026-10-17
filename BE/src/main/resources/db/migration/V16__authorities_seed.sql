-- V16__authorities_seed.sql: Seed authorities and quarantine places for Flow 2 testing

insert into authorities (id, name, country_code, kind, sla_days) values
    ('b0000000-0000-0000-0000-000000000001', 'Regional Animal Health Office No. VI (RAHO6)', 'VN', 'VETERINARY', 5),
    ('b0000000-0000-0000-0000-000000000002', 'Mộc Bài Customs Sub-Department', 'VN', 'CUSTOMS', 2),
    ('b0000000-0000-0000-0000-000000000003', 'General Directorate of Animal Health and Production (GDAHP)', 'KH', 'VETERINARY', 4),
    ('b0000000-0000-0000-0000-000000000004', 'Bavet International Border Customs', 'KH', 'CUSTOMS', 2),
    ('b0000000-0000-0000-0000-000000000005', 'Cambodia Border Animal Quarantine Station', 'KH', 'QUARANTINE', 1)
on conflict do nothing;

insert into places (id, name, kind, city, country_code, address) values
    ('a1000000-0000-0000-0000-000000000001', 'Phú Thọ Pre-Export Quarantine Station', 'QUARANTINE', 'Ho Chi Minh City', 'VN', 'District 11, HCMC'),
    ('a1000000-0000-0000-0000-000000000002', 'Svay Rieng Border Quarantine Station', 'QUARANTINE', 'Svay Rieng', 'KH', 'National Road 1, Svay Rieng'),
    ('a1000000-0000-0000-0000-000000000003', 'Phnom Penh Equestrian Quarantine Facility', 'QUARANTINE', 'Phnom Penh', 'KH', 'Dangkao, Phnom Penh')
on conflict do nothing;

do $$
declare
    v_job_id uuid := 'a0000000-0000-0000-0000-000000000041';
    v_auth_raho6 uuid := 'b0000000-0000-0000-0000-000000000001';
    v_auth_customs uuid := 'b0000000-0000-0000-0000-000000000002';
    v_yen_id uuid;
begin
    select id into v_yen_id from users where email = 'yen.vu@equifreight.vn';

    if exists (select 1 from transport_jobs where id = v_job_id) then
        if not exists (select 1 from authority_submissions where job_id = v_job_id and authority_id = v_auth_raho6) then
            insert into authority_submissions (id, job_id, authority_id, kind, status, filed_at, filed_by, reference_no, expected_by)
            values (gen_random_uuid(), v_job_id, v_auth_raho6, 'EXPORT_HEALTH_CERTS', 'FILED', now() - interval '2 days', v_yen_id, 'RAHO6-EXP-2026-081', (now() + interval '3 days')::date);
        end if;

        if not exists (select 1 from authority_submissions where job_id = v_job_id and authority_id = v_auth_customs) then
            insert into authority_submissions (id, job_id, authority_id, kind, status, filed_at, filed_by, reference_no, expected_by)
            values (gen_random_uuid(), v_job_id, v_auth_customs, 'CUSTOMS_DOSSIER', 'READY_TO_FILE', null, null, null, (now() + interval '5 days')::date);
        end if;

        if not exists (select 1 from quarantine_periods where job_id = v_job_id) then
            insert into quarantine_periods (id, job_id, place_id, starts_on, ends_on)
            values (gen_random_uuid(), v_job_id, 'a1000000-0000-0000-0000-000000000001', (now() - interval '7 days')::date, (now() - interval '1 days')::date);
        end if;
    end if;
end $$;
