import type { FC } from 'react';

import { Chip } from '@/components/ui';
import type { QuotationStatus } from '@/interfaces';

const STATUS_TONE: Record<QuotationStatus, 'info' | 'neutral' | 'ok' | 'warn'> = {
  ISSUED: 'info',
  ACCEPTED: 'ok',
  EXPIRED: 'neutral',
  SUPERSEDED: 'neutral',
  DECLINED: 'neutral',
  DRAFT: 'warn',
};

/** The version's status as a chip: "Issued" Info, "Expired" or "Superseded" Neutral, "Draft" Warn. */
export const VersionChip: FC<{ status: QuotationStatus }> = ({ status }) => (
  <Chip tone={STATUS_TONE[status]} dot={false}>
    {status.charAt(0) + status.slice(1).toLowerCase()}
  </Chip>
);
