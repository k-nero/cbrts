-- US-F2-02: the T-7, T-3 and T-1 reminders for documents the customer still owes, linked to the job's checklist.
alter type NotificationKind add value 'DOCUMENTS_DUE' after 'DOSSIER_LATE';
alter type NotificationSubject add value 'DOCUMENTS';
