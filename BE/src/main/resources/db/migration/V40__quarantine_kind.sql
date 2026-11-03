-- A quarantine is pre-export (before the horses leave the origin country) or post-arrival (after they land at the
-- destination), US-F3-22. Every quarantine so far is pre-export and the form doesn't ask yet; the kind is there so a
-- later story can resolve which quarantines hold departure, and their minimum length, per origin, through
-- QuarantineRules.

create type QuarantineKind as enum ('PRE_EXPORT', 'POST_ARRIVAL');

alter table quarantine_periods
    add column kind QuarantineKind not null default 'PRE_EXPORT';
