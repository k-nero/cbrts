-- The welfare stops a road route plans for are set on the route by the fleet & route coordinator, not worked out from
-- its distance: a road may have fewer welfare stations open than a formula would want. Blank until set, when no welfare
-- stops are planned or checked; a route short of the number is a warning, never a refusal. The rate catalog's welfare
-- interval (PLAN_WELFARE_EVERY_HOURS) is retired with it: nothing reads it, and versions that set it keep the row.

alter table corridors
    add column welfare_stops smallint check (welfare_stops between 0 and 20);
