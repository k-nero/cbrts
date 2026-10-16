-- Photos belong to the immutable horse-condition entry that was recorded at a stop.
create table condition_log_files (
    condition_log_id uuid not null references condition_logs (id),
    file_id uuid not null unique references files (id),
    primary key (condition_log_id, file_id)
);

create index condition_log_files_condition_log_id_idx on condition_log_files (condition_log_id);

create trigger condition_log_files_append_only before update or delete on condition_log_files
    for each row execute function forbid_update_delete();
