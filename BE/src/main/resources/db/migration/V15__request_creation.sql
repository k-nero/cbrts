-- Flow 1 request creation (US-F1-01, US-F1-02); docs/database/database-design.md §7, §8.

-- BR-F1-01: lead_time_days is the cross-border lead time into the country; a move within it needs this.
alter table regulation_versions add column domestic_lead_time_days smallint not null default 3;
