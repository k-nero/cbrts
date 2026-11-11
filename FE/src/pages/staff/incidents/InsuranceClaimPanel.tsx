import { type FC, useState } from 'react';
import { Flex } from 'antd';

import { ClaimOutcomeModal } from './ClaimOutcomeModal';
import { FileClaimModal } from './FileClaimModal';
import { CLAIM_STATUS, money } from './incidentFormat';
import type { ClaimOutcomeForm } from './schema';

import { Button, Chip, Panel } from '@/components/ui';
import type { Incident } from '@/interfaces';
import { InsuranceClaimStatusEnum, InsuranceOptionEnum } from '@/interfaces';
import { formatDayTime } from '@/lib/utils';

/**
 * The incident's insurance claim (US-F5-08). Only a job insured with EquiFreight takes one; the insurer pays the owner
 * directly, so the claim is a record and never touches the invoice. Only the logistics manager files or settles it.
 */
export const InsuranceClaimPanel: FC<{ incident: Incident; isManager: boolean }> = ({
  incident,
  isManager,
}) => {
  const [filing, setFiling] = useState(false);
  const [outcome, setOutcome] = useState<ClaimOutcomeForm['outcome'] | null>(null);
  const claim = incident.insuranceClaim;

  if (incident.insurance !== InsuranceOptionEnum.EQUIFREIGHT) {
    return (
      <Panel title="Insurance claim">
        <p className="type-body-m m-0 text-ink-3">
          {incident.insurance === InsuranceOptionEnum.OWN_POLICY
            ? 'The customer is insured on their own policy and claims on it themselves.'
            : 'The job has no insurance chosen.'}
        </p>
      </Panel>
    );
  }

  if (!claim) {
    return (
      <Panel
        title="Insurance claim"
        extra={
          isManager && (
            <Button size="sm" leadingIcon="plus" onClick={() => setFiling(true)}>
              File a claim
            </Button>
          )
        }
      >
        <p className="type-body-m m-0 text-ink-3">
          Insured with EquiFreight. No claim filed; the insurer pays the owner directly.
        </p>
        <FileClaimModal incident={incident} open={filing} onClose={() => setFiling(false)} />
      </Panel>
    );
  }

  const status = CLAIM_STATUS[claim.status];
  return (
    <Panel title="Insurance claim" extra={<Chip tone={status.tone}>{status.label}</Chip>}>
      <Flex vertical gap={8}>
        <p className="type-label-m m-0 text-ink">
          {claim.insurer} · {claim.reference} · claimed{' '}
          {money(incident.currency, claim.claimedAmount)}
        </p>
        {claim.note && <p className="type-body-m m-0 text-ink-2">{claim.note}</p>}
        <p className="type-body-s m-0 text-ink-3">
          Filed by {claim.filedByName ?? 'the logistics manager'}, {formatDayTime(claim.filedAt)}
        </p>
        {claim.status === InsuranceClaimStatusEnum.SETTLED && claim.settledAmount != null && (
          <p className="type-body-m m-0 text-ink">
            Paid {money(incident.currency, claim.settledAmount)} to the owner directly
            {claim.closedAt ? `, ${formatDayTime(claim.closedAt)}` : ''}.
          </p>
        )}
        {claim.status === InsuranceClaimStatusEnum.DECLINED && (
          <p className="type-body-m m-0 text-ink">Declined: {claim.declineReason}</p>
        )}
        {isManager && claim.status === InsuranceClaimStatusEnum.FILED && (
          <Flex gap={8} justify="end">
            <Button size="sm" onClick={() => setOutcome('DECLINED')}>
              Declined
            </Button>
            <Button size="sm" variant="primary" onClick={() => setOutcome('SETTLED')}>
              Settled
            </Button>
          </Flex>
        )}
      </Flex>
      <ClaimOutcomeModal
        incident={incident}
        claim={claim}
        outcome={outcome}
        onClose={() => setOutcome(null)}
      />
    </Panel>
  );
};
