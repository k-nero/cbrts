-- Flow 3 (US-F3-08): Logistics manager trip plan sign-off.
alter table transport_jobs
    add column signed_off_at timestamptz,
    add column signed_off_by uuid references users (id);
