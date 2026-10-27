-- Flow 3 (US-F3-21): the coordinator builds a job's journey one trip at a time, and a road corridor is driven either
-- way. A trip shared by several jobs runs one way only, so the direction is stored on the trip rather than worked out
-- from a job's chain. Every existing trip runs its corridor as written.

alter table trips
    add column reversed boolean default false not null;
