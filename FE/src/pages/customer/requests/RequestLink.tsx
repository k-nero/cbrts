import { type FC } from 'react';
import { Link } from 'react-router-dom';

import { cx } from '@/components/ui';
import type { RequestSummary } from '@/interfaces';
import { ict } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * The request's name as a real link, so the keyboard and a screen reader reach every row, even one
 * with no step to take: its code, or for a draft the day it was started (the chip says Draft).
 */
export const RequestLink: FC<{ row: RequestSummary }> = ({ row: r }) => {
  const router = useCustomRouter();
  const draft = r.status === 'DRAFT';
  const started = ict(r.createdAt).format('D MMM');
  return (
    <Link
      to={router.paths.get(draft ? 'request-edit' : 'request', { pathParams: [r.id] })}
      // The row opens the request on a click as well; the link mustn't open it twice.
      onClick={(e) => e.stopPropagation()}
      aria-label={draft ? `Draft started ${started}` : undefined}
      // AntD's reset takes the underline off links; the code is the row's link, so it keeps one.
      className={cx(
        'underline! underline-offset-2',
        draft ? 'type-body-s text-ink-2!' : 'type-caption text-ink!',
      )}
    >
      {draft ? `Started ${started}` : r.code}
    </Link>
  );
};
