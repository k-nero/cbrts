-- US-F3-16: a job planned as a chain of trips (docs/multi-trip-jobs-design.md). New enum values come in their own
-- migration: Postgres can't use a value in the transaction that added it.

-- A horse waiting for a later trip of its job's chain, and one that left this trip for the next.
alter type TripHorseStatus add value 'PLANNED' after 'LEFT_IN_CARE';
alter type TripHorseStatus add value 'HANDED_ON' after 'PLANNED';

-- Where a job's horses leave this trip for the next one of its chain.
alter type RouteStopKind add value 'TRANSFER' after 'REFUELLING';
