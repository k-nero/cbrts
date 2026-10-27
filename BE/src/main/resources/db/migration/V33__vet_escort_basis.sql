-- Flow 1: a road customer can ask for a vet escort; the rate catalog prices it with its own basis, once per shipment
-- when asked. An air move's vet stays the FLIGHT_VET line.
alter type RateBasis add value 'VET_ESCORT' after 'FLIGHT_VET';
