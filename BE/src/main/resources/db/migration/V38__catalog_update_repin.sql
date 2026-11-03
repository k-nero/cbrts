-- A job moves onto a newer published regulation version when the specialist chooses to (PRODUCT.md: a later change
-- never silently alters an in-flight case). The pin it leaves is kept as history; only pins without superseded_at
-- are in force.
alter table job_regulation_pins
    add column superseded_at timestamp(6) with time zone;

-- An item whose document the newer version no longer lists stays on the checklist, marked dropped, and no longer
-- counts toward the gate; an item the newer version added is marked so the checklist can say so.
alter table checklist_items
    add column dropped_at       timestamp(6) with time zone,
    add column added_by_update  boolean not null default false;
