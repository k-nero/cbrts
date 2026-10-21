-- Keep the checklist items physically presented at a border with the append-only trip record.
alter table trip_records
    add column documents_shown jsonb not null default '[]'::jsonb,
    add constraint trip_records_documents_shown_array_check
        check (jsonb_typeof(documents_shown) = 'array');
