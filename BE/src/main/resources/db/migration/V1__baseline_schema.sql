-- Accounts and sign-in. Every table uses app-generated UUIDv7 keys (BaseEntity).

create table roles
(
    id          uuid                                      not null,
    created_at  timestamp(6) with time zone default now() not null,
    updated_at  timestamp(6) with time zone,
    name        varchar(255)                              not null unique,
    description varchar(255),
    primary key (id)
);

create table users
(
    id         uuid                                      not null,
    created_at timestamp(6) with time zone default now() not null,
    updated_at timestamp(6) with time zone,
    email      varchar(255) unique,
    first_name varchar(255)                              not null,
    last_name  varchar(255)                              not null,
    phone      varchar(20),
    password   varchar(255)                              not null,
    primary key (id)
);

create table user_roles
(
    user_id uuid not null references users (id) on delete cascade,
    role_id uuid not null references roles (id),
    primary key (role_id, user_id)
);

create table refresh_tokens
(
    id          uuid                                      not null,
    created_at  timestamp(6) with time zone default now() not null,
    updated_at  timestamp(6) with time zone,
    token       varchar(255)                              not null unique,
    user_id     uuid                                      not null references users (id) on delete cascade,
    expiry_date timestamp(6) with time zone               not null,
    revoked     boolean                                   not null,
    primary key (id)
);

create index refresh_tokens_user_id_idx on refresh_tokens (user_id);
create index refresh_tokens_expiry_date_idx on refresh_tokens (expiry_date);
