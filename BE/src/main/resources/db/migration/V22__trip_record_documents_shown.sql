create table trip_record_documents
(
    trip_record_id    uuid not null references trip_records (id),
    checklist_item_id uuid not null references checklist_items (id),
    primary key (trip_record_id, checklist_item_id)
);

create index trip_record_documents_checklist_item_id_idx
    on trip_record_documents (checklist_item_id);

create trigger trip_record_documents_append_only
    before update or delete
    on trip_record_documents
    for each row execute function forbid_update_delete();
