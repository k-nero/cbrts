-- V19__add_signed_off_columns.sql: Ensure signed_off_at and signed_off_by exist on transport_jobs
alter table transport_jobs
    add column if not exists signed_off_at timestamptz,
    add column if not exists signed_off_by uuid references users (id);
