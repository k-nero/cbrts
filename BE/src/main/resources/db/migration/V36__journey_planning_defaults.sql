-- Flow 3 (US-F3-22): drafting a job's journey from its quoted route times its road routes from the rate catalog's
-- planning defaults: the start hour, the average speed, the welfare and border stops, and the time at the cargo
-- terminal either side of a flight. A version that doesn't set one uses the default the application keeps.

alter type RatePolicyKey add value 'PLAN_START_HOUR';
alter type RatePolicyKey add value 'PLAN_SPEED_KMH';
alter type RatePolicyKey add value 'PLAN_WELFARE_EVERY_HOURS';
alter type RatePolicyKey add value 'PLAN_WELFARE_STOP_MIN';
alter type RatePolicyKey add value 'PLAN_BORDER_STOP_MIN';
alter type RatePolicyKey add value 'PLAN_AIRPORT_BEFORE_HOURS';
alter type RatePolicyKey add value 'PLAN_AIRPORT_AFTER_HOURS';
