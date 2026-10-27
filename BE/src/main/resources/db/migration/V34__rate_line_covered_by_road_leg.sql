-- Flow 1 (US-F3-21): a move by way of a hub prices its domestic road leg to or from the cargo terminal, so the flat
-- road transfer at that end was charged twice. A line flagged here isn't charged at an end a road leg covers: group A
-- at the origin, G at the destination.

alter table rate_lines
    add column covered_by_road_leg boolean default false not null;

alter table rate_lines
    add constraint rate_lines_covered_by_road_leg_check check (not covered_by_road_leg or group_code in ('A', 'G'));

-- The air corridors' flat transfers to and from the cargo terminal, in every catalog version.
update rate_lines
set covered_by_road_leg = true
where code in ('TRANSFER_ORIGIN', 'TRANSFER_DEST')
  and group_code in ('A', 'G');
