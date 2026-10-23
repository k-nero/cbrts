-- Trips get their own code, TRP-YYYY-NNN (US-F3-09). Postgres can't use an enum value in the transaction that adds
-- it, so the trips themselves are created in V7.
alter type CodePrefix add value 'TRP';
