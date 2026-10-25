-- BR-Q-16: the request keeps each horse's weight with the other fields that price it, and the rate catalog gains the
-- payload of one air stall and the most horse weight one air shipment may carry. Requests sent before this keep the
-- weight their horses have now. The new enum values aren't used here, so adding them inside the transaction is safe.
alter table request_horses add column weight_kg smallint;

update request_horses rh
set weight_kg = h.weight_kg
from horses h
where h.id = rh.horse_id;

alter type RatePolicyKey add value 'STALL_PAYLOAD_KG';
alter type RatePolicyKey add value 'AIR_SHIPMENT_MAX_KG';
