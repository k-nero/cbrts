-- Flow 1 slice 6: issuing the quotation (US-F1-05 #17), overrides and manual lines (US-Q-02 #23), re-quote versions
-- (US-Q-07 #28). An issued version is a document: what the engine would otherwise re-derive (the totals' wording,
-- the stall sizing, the request as quoted) is frozen in its snapshot.
alter table quotations add column issued_snapshot jsonb;
-- Set when the club was reminded, a day before the quotation expires.
alter table quotations add column reminder_sent_at timestamptz;

-- The line's identity across re-prices and revisions, where catalog line ids change: the rate line's code (plus the
-- horse for a per-day line of one horse), STALL, MISSING:n for a gap, MANUAL:uuid for a line the manager added.
alter table quotation_lines add column line_key varchar(80);
-- Why the logistics manager added the line; set only on an added line.
alter table quotation_lines add column manual_reason varchar(300);
alter table quotation_lines add constraint quotation_lines_manual_check
    check (manual_reason is null or (source = 'MANUAL' and unit_rate is not null));
