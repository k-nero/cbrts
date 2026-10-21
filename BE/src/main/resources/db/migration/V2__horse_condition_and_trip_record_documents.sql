-- V2: Replace legacy horse condition enum with the four values from docs/requirement.txt,
--     and add a trip_record_documents table for referential integrity.

-- 1. Replace the HorseCondition enum with only the four requirement values.
--    Map SOUND -> STABLE (healthy), WATCH -> STRESSED (monitoring), CONCERN -> OFF_FEED (concern).
--    CLIMATE_CHANGE has no legacy mapping; rows with it did not exist yet (only on this branch).

-- Step 1a: add a new type with only the correct four values.
create type HorseCondition_new as enum ('STABLE', 'OFF_FEED', 'STRESSED', 'CLIMATE_CHANGE');

-- Step 1b: convert the column to the new type via a mapping expression.
alter table condition_logs
    alter column condition type HorseCondition_new
        using (case condition::text
            when 'SOUND'          then 'STABLE'
            when 'WATCH'          then 'STRESSED'
            when 'CONCERN'        then 'OFF_FEED'
            when 'STABLE'         then 'STABLE'
            when 'OFF_FEED'       then 'OFF_FEED'
            when 'STRESSED'       then 'STRESSED'
            when 'CLIMATE_CHANGE' then 'CLIMATE_CHANGE'
        end)::HorseCondition_new;

-- Step 1c: drop the old type and rename the new one to the canonical name.
drop type HorseCondition;
alter type HorseCondition_new rename to HorseCondition;

-- 2. Add a trip_record_documents table instead of a jsonb array.
--    Foreign keys prevent stale or cross-job ids. The unique pair makes it append-only like condition_logs.
create table public.trip_record_documents
(
    id                  uuid primary key,
    trip_record_id      uuid not null
        constraint trip_record_documents_trip_record_id_fkey
            references public.trip_records (id),
    checklist_item_id   uuid not null
        constraint trip_record_documents_checklist_item_id_fkey
            references public.checklist_items (id),
    constraint trip_record_documents_trip_record_id_checklist_item_id_key
        unique (trip_record_id, checklist_item_id)
);
