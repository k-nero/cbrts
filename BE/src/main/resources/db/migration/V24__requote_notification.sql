-- Flow 1, core flows A4: the customer asks for a re-quote of an expired quotation, and the logistics manager hears.
alter type NotificationKind add value 'QUOTATION_REQUOTE_ASKED' after 'QUOTATION_DECLINED';
