import type { FC } from 'react';

import { Button, Callout } from '@/components/ui';
import { useRequestChecklist } from '@/hooks/clearance';
import { dueLeft, formatDate, isOverdue, isOwedByCustomer } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/** An approved request's documents in one line: what the club owes, the first due date, and the way in. */
const DocumentsCallout: FC<{ requestId: string }> = ({ requestId }) => {
  const router = useCustomRouter();
  const { data: items = [] } = useRequestChecklist(requestId);
  if (items.length === 0) return null;

  const now = new Date().toISOString();
  const owed = items
    .filter(isOwedByCustomer)
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  const overdue = owed.filter((item) => isOverdue(item, now)).length;
  const first = owed.find((item) => item.dueDate)?.dueDate;

  return (
    <Callout
      tone={overdue > 0 ? 'bad' : owed.length > 0 ? 'warn' : 'ok'}
      title={
        owed.length === 0
          ? 'No documents needed from you right now'
          : `You owe ${owed.length} ${owed.length === 1 ? 'document' : 'documents'}`
      }
      action={
        <Button
          size="sm"
          onClick={() =>
            router.push(router.paths.get('request-documents', { pathParams: [requestId] }))
          }
        >
          See all documents
        </Button>
      }
    >
      {owed.length === 0
        ? 'Your transport specialist and the authorities hold the rest.'
        : first
          ? `${overdue > 0 ? `${overdue} overdue. ` : ''}First due ${formatDate(first)} (${dueLeft(first, now).toLowerCase()}).`
          : 'Due dates are set once departure is planned.'}
    </Callout>
  );
};

export default DocumentsCallout;
