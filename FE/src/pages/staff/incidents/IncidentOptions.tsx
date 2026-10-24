import { useState } from 'react';
import { App, Col, Flex, Row } from 'antd';

import { AddOptionModal } from './AddOptionModal';
import { duration, money } from './incidentFormat';
import { ProposeModal } from './ProposeModal';

import { Button, Callout, Chip, FactCell, Panel } from '@/components/ui';
import { useRemoveIncidentOption } from '@/hooks/incident';
import type { Incident, IncidentOption } from '@/interfaces';
import { IncidentStatusEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { formatTime } from '@/pages/trip/tripFormat';

/** What an option costs, side by side; a value that costs something takes the warn tone (DESIGN.md, Incident). */
function Costs({ option, currency }: { option: IncidentOption; currency: string }) {
  const warn = 'text-warn';
  return (
    <Row gutter={[8, 8]}>
      <Col xs={24} md={8}>
        <FactCell
          label="Arrival"
          value={
            <span className={option.delayMinutes > 0 ? warn : undefined}>
              {option.delayMinutes > 0 ? `+ ${duration(option.delayMinutes)}` : 'No delay'}
            </span>
          }
        />
      </Col>
      <Col xs={24} md={8}>
        <FactCell
          label="Extra cost"
          value={
            <span className={option.extraCost > 0 ? warn : undefined}>
              {option.extraCost > 0 ? `+ ${money(currency, option.extraCost)}` : 'None'}
            </span>
          }
        />
      </Col>
      <Col xs={24} md={8}>
        <FactCell
          label="Route"
          value={
            <span className={option.changesRoute ? warn : undefined}>
              {option.changesRoute ? 'New route version' : 'Same route'}
            </span>
          }
        />
      </Col>
    </Row>
  );
}

/**
 * The options considered for an incident (US-F5-02): each with its cost side by side, so the decision can be explained
 * later. The coordinator adds them and proposes one; the manager decides (US-F5-03).
 */
export function IncidentOptions({ incident }: { incident: Incident }) {
  const { message } = App.useApp();
  const [adding, setAdding] = useState(false);
  const [proposing, setProposing] = useState<IncidentOption | null>(null);
  const remove = useRemoveIncidentOption(incident.id);
  const editable =
    incident.status === IncidentStatusEnum.OPEN && incident.proposedOptionId === null;
  const proposed = incident.options.find((o) => o.id === incident.proposedOptionId);

  return (
    <Panel
      title="Options"
      extra={
        editable ? (
          <Button size="sm" leadingIcon="plus" onClick={() => setAdding(true)}>
            Add an option
          </Button>
        ) : undefined
      }
    >
      <Flex vertical gap={16}>
        {proposed && incident.status === IncidentStatusEnum.OPEN && (
          <Callout tone="warn" title={`“${proposed.title}” waits for a decision`}>
            {`${incident.proposedByName ?? 'The coordinator'} proposed it ${formatTime(
              incident.proposedAt,
            )}${incident.proposalNote ? `: “${incident.proposalNote}”` : '.'} ${
              incident.ownerName ?? 'The logistics manager'
            } decides.`}
          </Callout>
        )}
        {incident.options.length === 0 ? (
          <p className="type-body-s m-0 text-ink-3">
            No options yet. Add each way of handling it, with what it costs and how much later the
            horses arrive.
          </p>
        ) : (
          <Flex component="ol" vertical gap={12} className="m-0 list-none p-0">
            {incident.options.map((option) => (
              <li key={option.id} className="rounded-lg border border-line bg-card p-4">
                <Flex vertical gap={12}>
                  <Flex wrap align="start" justify="space-between" gap={8}>
                    <div className="min-w-0">
                      <strong className="type-h4">
                        {option.position}. {option.title}
                      </strong>
                      {option.description && (
                        <p className="type-body-s m-0 text-ink-2">{option.description}</p>
                      )}
                      {option.leavingKind && (
                        <p className="type-body-s m-0 text-ink">
                          {option.leavingKindLabel}: {option.horseNames.join(', ')}
                          {option.leavingPlace ? ` → ${option.leavingPlace}` : ''}
                          {option.vehicleCode ? ` · ${option.vehicleCode}` : ''}
                        </p>
                      )}
                      <p className="type-caption m-0 text-ink-3">
                        {option.extraCost > 0
                          ? option.customerPays
                            ? 'Proposed: the customer pays'
                            : 'Proposed: EquiFreight pays'
                          : null}
                      </p>
                      <p className="type-caption m-0 text-ink-3">
                        Recorded by {option.createdByName ?? 'staff'},{' '}
                        {formatTime(option.createdAt)}
                      </p>
                    </div>
                    {option.id === incident.decidedOptionId ? (
                      <Chip tone="ok">Approved</Chip>
                    ) : (
                      option.id === incident.proposedOptionId && <Chip tone="info">Proposed</Chip>
                    )}
                    {editable && (
                      <Flex gap={8}>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={remove.isPending}
                          onClick={() =>
                            remove.mutate(option.id, {
                              onError: (e) =>
                                message.error(apiErrorMessage(e, 'The option wasn’t removed.')),
                            })
                          }
                        >
                          Remove
                        </Button>
                        <Button size="sm" onClick={() => setProposing(option)}>
                          Propose
                        </Button>
                      </Flex>
                    )}
                  </Flex>
                  <Costs option={option} currency={incident.currency} />
                </Flex>
              </li>
            ))}
          </Flex>
        )}
      </Flex>
      <AddOptionModal incident={incident} open={adding} onClose={() => setAdding(false)} />
      <ProposeModal incident={incident} option={proposing} onClose={() => setProposing(null)} />
    </Panel>
  );
}
