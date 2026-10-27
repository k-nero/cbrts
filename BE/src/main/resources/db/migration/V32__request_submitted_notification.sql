-- Flow 1, core flows §2.3 step 5: a submitted or resubmitted request tells the logistics managers it is in the queue.
alter type NotificationKind add value 'REQUEST_SUBMITTED' before 'REQUEST_INFO_REQUIRED';
