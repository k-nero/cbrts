-- #115: how far a request's flexible dates can move depends on the road, so each corridor sets it. The fleet
-- & route coordinator edits it; a request with flexible dates takes its route's value, copied at submission.
-- 0 means the route runs on fixed dates only.
alter table corridors add column date_flex_days smallint not null default 3
    constraint corridors_date_flex_days_check check (date_flex_days between 0 and 7);

-- A request's flex is now its route's value, so it is no longer only 0 or 3.
alter table transport_requests drop constraint transport_requests_date_flex_days_check;
alter table transport_requests add constraint transport_requests_date_flex_days_check
    check (date_flex_days between 0 and 7);
