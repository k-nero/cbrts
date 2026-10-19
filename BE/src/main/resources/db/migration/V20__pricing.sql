-- Flow 1B pricing (US-Q-10 #31, US-Q-01 #22, US-Q-09 #30): catalog line rules the quotation engine reads,
-- and quotation lines priced from an air stall class.

-- Grooms (one per three horses) and the flight vet (by count, declared value or vet escort) are step rules.
alter table rate_lines drop constraint rate_lines_basis_check;
alter table rate_lines add constraint rate_lines_basis_check check (basis in ('PER_HORSE', 'PER_SHIPMENT', 'PER_KM',
    'PER_DAY', 'PER_CROSSING', 'PER_HOUR', 'PER_POSITION', 'PER_THREE_HORSES', 'FLIGHT_VET'));

-- A road rate can be for one trailer kind; null means both.
alter table rate_lines add column applies_to_trailer varchar(10)
    constraint rate_lines_applies_to_trailer_check check (applies_to_trailer in ('SHARED', 'PRIVATE'));
-- The hours a per-hour line assumes ("2 h estimated").
alter table rate_lines add column default_quantity numeric(10, 2);
alter table rate_lines add constraint rate_lines_default_quantity_check
    check (basis <> 'PER_HOUR' or default_quantity is not null);
-- Why an estimated line may vary, copied to the quotation line.
alter table rate_lines add column estimate_note varchar(300);

alter table quotation_lines drop constraint quotation_lines_basis_check;
alter table quotation_lines add constraint quotation_lines_basis_check check (basis in ('PER_HORSE', 'PER_SHIPMENT',
    'PER_KM', 'PER_DAY', 'PER_CROSSING', 'PER_HOUR', 'PER_POSITION', 'PER_THREE_HORSES', 'FLIGHT_VET'));

-- The air stall line is priced from a service class, not a catalog line.
alter table quotation_lines add column rate_service_class_id uuid references rate_service_classes (id);
alter table quotation_lines drop constraint quotation_lines_rate_line_check;
alter table quotation_lines add constraint quotation_lines_rate_line_check
    check (source <> 'CATALOG' or num_nonnulls(rate_line_id, rate_service_class_id) = 1);

-- The class the manager priced, which may differ from the customer's choice.
alter table quotations add column air_class varchar(10)
    constraint quotations_air_class_check check (air_class in ('ECONOMY', 'BUSINESS', 'FIRST'));

-- Who changed the draft last, shown on the Rates page.
alter table rate_catalog_versions add column last_edited_by uuid references users (id);
