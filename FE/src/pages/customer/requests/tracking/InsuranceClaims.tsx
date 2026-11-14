import type { FC } from 'react';
import { Flex } from 'antd';

import { Chip, Panel, type Tone } from '@/components/ui';
import { useRequestInsuranceClaims } from '@/hooks/incident';
import type { CustomerInsuranceClaim, InsuranceClaimStatus } from '@/interfaces';
import { formatDate, money } from '@/lib/utils';

const STATUS: Record<InsuranceClaimStatus, { tone: Tone; label: string }> = {
  FILED: { tone: 'warn', label: 'With the insurer' },
  SETTLED: { tone: 'ok', label: 'Settled' },
  DECLINED: { tone: 'bad', label: 'Declined' },
};

/** What came of the claim, in the customer's words. */
const outcome = (c: CustomerInsuranceClaim) => {
  if (c.status === 'SETTLED' && c.settledAmount != null)
    return `${c.insurer} paid ${money(c.settledAmount, c.currency)} to you directly${c.closedAt ? ` on ${formatDate(c.closedAt)}` : ''}.`;
  if (c.status === 'DECLINED') return `${c.insurer} declined it: ${c.declineReason}`;
  return `Waiting for ${c.insurer}'s answer. We tell you as soon as it comes.`;
};

/**
 * The insurance claims EquiFreight filed on this move (US-F5-08): which incident, with whom, the reference, what was
 * claimed and what came of it. The insurer pays the owner directly, so nothing here is on the invoices. Hidden when
 * there is no claim.
 */
export const InsuranceClaims: FC<{ requestId: string }> = ({ requestId }) => {
  const { data: claims } = useRequestInsuranceClaims(requestId);
  if (!claims?.length) return null;
  return (
    <Panel title="Insurance claims">
      <Flex vertical gap={16}>
        {claims.map((c) => {
          const status = STATUS[c.status];
          return (
            <Flex key={c.id} vertical gap={4}>
              <Flex justify="space-between" align="center" gap={12}>
                <span className="type-label-m text-ink">
                  {c.incidentLabel} · {c.jobCode}
                </span>
                <Chip tone={status.tone}>{status.label}</Chip>
              </Flex>
              <span className="type-body-m text-ink-2">
                Filed with {c.insurer} on {formatDate(c.filedAt)}, reference {c.reference}, for{' '}
                {money(c.claimedAmount, c.currency)}.
              </span>
              <span className="type-body-m text-ink">{outcome(c)}</span>
            </Flex>
          );
        })}
      </Flex>
    </Panel>
  );
};
