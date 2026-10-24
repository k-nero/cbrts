-- US-F3-14: the customer is told when their horses will share a trailer, when a trip change moves their times, and
-- when their job is taken off a shared trip before departure (docs/shared-trips-design.md, Customer notifications).
alter type NotificationKind add value 'TRIP_SHARED' after 'TRIP_HELD';
alter type NotificationKind add value 'TRIP_TIMES_CHANGED' after 'TRIP_SHARED';
alter type NotificationKind add value 'JOB_REPLANNED' after 'TRIP_TIMES_CHANGED';

-- They open the job's tracking: the customer's Trip tracking, the staff Trip tab, the escort's cab surface.
alter type NotificationSubject add value 'TRIP_TRACKING';
