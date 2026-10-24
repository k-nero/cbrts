-- US-00-08: a customer note reaches the role that answers it, and the customer hears when it is answered.
alter type NotificationKind add value 'NOTE_RECEIVED' after 'PAYMENT_RECORDED';
alter type NotificationKind add value 'NOTE_ANSWERED' after 'NOTE_RECEIVED';
alter type NotificationSubject add value 'NOTE' after 'INVOICE';

-- The demo seeder routed trip notes to a role name that doesn't exist, so no one could see them.
update public.notes
set routed_role = 'FLEET_COORDINATOR'
where routed_role = 'FLEET_ROUTE_COORDINATOR';
