-- An aggressive horse always travels in a box stall (HorseSizing.stallFor). Horses saved before that rule keep the stall
-- they were saved with; they take the box stall now, and the size class it implies: at least L, as the application sizes
-- a box stall (HorseSizing.BOX_STALL_MIN_CLASS). Requests keep the horse fields they were sent with (request_horses).
-- The size classes are seeded by the application, so on an empty database there is nothing to update.
update horses h
set required_stall = 'BOX',
    size_class_id  = case when cur.min_height_hh < box.min_height_hh then box.id else h.size_class_id end
from horse_size_classes cur,
     horse_size_classes box
where cur.id = h.size_class_id
  and box.code = 'L'
  and h.temperament = 'AGGRESSIVE'
  and h.required_stall <> 'BOX';
