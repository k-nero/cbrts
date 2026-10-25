-- BR-Q-16: the request keeps each horse's weight with the other fields that price it, and the rate catalog gains the
-- payload of one air stall and the most horse weight one air shipment may carry. Requests sent before this keep the
-- weight their horses have now, except approved ones: their horses are locked (BR-F1-06, request_horses_lock), and
-- their accepted quotation is never priced again. The new enum values aren't used here, so adding them inside the
-- transaction is safe.
alter table request_horses add column weight_kg smallint;

update request_horses rh
set weight_kg = h.weight_kg
from horses h,
     transport_requests r
where h.id = rh.horse_id
  and r.id = rh.request_id
  and r.status <> 'APPROVED';

alter type RatePolicyKey add value 'STALL_PAYLOAD_KG';
alter type RatePolicyKey add value 'AIR_SHIPMENT_MAX_KG';
