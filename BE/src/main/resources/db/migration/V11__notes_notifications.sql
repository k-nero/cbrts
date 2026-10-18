-- Domain K (§13): customer notes (routed by topic, never a free chat) and in-app notifications.

create table notes (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    club_id uuid not null references clubs (id),
    request_id uuid references transport_requests (id),
    job_id uuid references transport_jobs (id),
    checklist_item_id uuid references checklist_items (id),
    topic varchar(20) not null
        constraint notes_topic_check check (topic in ('DOCUMENTS', 'DATES_PRICE_CHANGES', 'TRIP', 'OTHER')),
    routed_role varchar(30) not null,
    assignee_id uuid references users (id),
    subject varchar(160) not null,
    body text not null,
    created_by uuid not null references users (id),
    reply_due_at timestamptz,
    status varchar(12) not null default 'OPEN'
        constraint notes_status_check check (status in ('OPEN', 'ANSWERED', 'CLOSED')),
    primary key (id),
    constraint notes_subject_check check (request_id is not null or job_id is not null)
);

create index notes_club_id_idx on notes (club_id);

create table note_replies (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    note_id uuid not null references notes (id) on delete cascade,
    author_id uuid not null references users (id),
    body text not null,
    primary key (id)
);

create table notifications (
    id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    user_id uuid not null references users (id) on delete cascade,
    kind varchar(40) not null,
    title varchar(160) not null,
    body varchar(1000),
    entity_type varchar(40),
    entity_id uuid,
    read_at timestamptz,
    emailed_at timestamptz,
    primary key (id)
);

create index notifications_user_id_read_at_idx on notifications (user_id, read_at);
