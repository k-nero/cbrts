-- Flow 4, US-F4-05: the customer hears when their horses clear customs and when they reach the handover point.
alter type NotificationKind add value 'HORSES_CLEARED_CUSTOMS' after 'JOB_REPLANNED';
alter type NotificationKind add value 'HORSES_ARRIVED' after 'HORSES_CLEARED_CUSTOMS';
