-- US-F3-22: a quarantine scheduled, changed or completed tells the job's coordinator and its club; the logistics manager
-- who approved the job hears only when it clashes with the trips already planned.
alter type NotificationKind add value 'QUARANTINE_SCHEDULED' after 'DOCUMENTS_DUE';
alter type NotificationKind add value 'QUARANTINE_CHANGED' after 'QUARANTINE_SCHEDULED';
alter type NotificationKind add value 'QUARANTINE_COMPLETED' after 'QUARANTINE_CHANGED';
alter type NotificationKind add value 'QUARANTINE_CONFLICT' after 'QUARANTINE_COMPLETED';
