-- Domain A (§3): the CBRTS columns on users, emailed links and sign-in attempts.

alter table users
    add column club_id uuid references clubs (id),
    add column staff_code varchar(10) unique,
    add column escort_kind varchar(20) constraint users_escort_kind_check check (escort_kind in ('DRIVER', 'GROOM')),
    add column status varchar(20) not null default 'ACTIVE'
        constraint users_status_check check (status in ('INVITED', 'ACTIVE', 'LOCKED', 'DISABLED')),
    add column email_verified_at timestamptz,
    add column locked_until timestamptz,
    add column last_active_at timestamptz,
    add column invited_by uuid references users (id),
    add constraint users_customer_or_staff_check check (club_id is null or staff_code is null);

-- One account per club. Dropping this index allows several people per club.
create unique index users_club_id_idx on users (club_id) where club_id is not null;

create table account_tokens (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    user_id uuid not null references users (id) on delete cascade,
    purpose varchar(20) not null
        constraint account_tokens_purpose_check check (purpose in ('VERIFY_EMAIL', 'STAFF_INVITE', 'RESET_PASSWORD')),
    token_hash varchar(100) not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    revoked_at timestamptz,
    primary key (id)
);

create index account_tokens_user_id_idx on account_tokens (user_id);

create table sign_in_attempts (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    email varchar(255) not null,
    user_id uuid references users (id) on delete set null,
    succeeded boolean not null,
    ip inet,
    attempted_at timestamptz not null default now(),
    primary key (id)
);

create index sign_in_attempts_email_attempted_at_idx on sign_in_attempts (email, attempted_at desc);
