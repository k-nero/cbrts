-- US-Q-05: the customer's instant estimate reads its minimum band width from the rate catalog (BR-Q-11).
-- Published versions are immutable, so no value is written here: a fresh catalog is seeded with 15, and an
-- existing one gets the value when the transport specialist publishes a version that has it.
alter table rate_policies drop constraint rate_policies_key_check;
alter table rate_policies add constraint rate_policies_key_check check (key in ('FUEL_PCT', 'INSURANCE_PCT',
    'CONTINGENCY_PCT', 'SERVICE_FEE_PCT', 'DEPOSIT_PCT', 'QUOTE_VALIDITY_DAYS', 'FLIGHT_VET_MIN_HORSES',
    'HIGH_VALUE_THRESHOLD', 'ARRIVAL_WINDOW_PCT', 'ARRIVAL_WINDOW_MIN_HOURS', 'LATE_PENALTY_PCT_PER_HOUR',
    'LATE_PENALTY_CAP_PCT', 'ESTIMATE_BAND_PCT'));
