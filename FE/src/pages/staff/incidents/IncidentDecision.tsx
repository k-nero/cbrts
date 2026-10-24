import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';
import { useWatch } from 'react-hook-form';

import { duration, money } from './incidentFormat';
import { ReturnModal } from './ReturnModal';
import { type DecideForm, decideSchema } from './schema';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button, Callout, Panel } from '@/components/ui';
import { useDecideIncident } from '@/hooks/incident';
import type { Incident, IncidentOption } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { formatTime } from '@/pages/trip/tripFormat';

/** What approving the option will do, in the order it happens (DESIGN.md, Incident: the decision composer). */
const consequences = (incident: Incident, option: IncidentOption, charge: boolean) => [
  ...(option.leavingKind === 'LEAVE_IN_CARE'
    ? [
        `${option.horseNames.join(', ')} ${option.horseNames.length === 1 ? 'is' : 'are'} left in care at ${option.leavingPlace}, and count as delivered for this move.`,
      ]
    : option.leavingKind
      ? [
          `${option.horseNames.join(', ')} leave the trip for a new trip of their own (${option.leavingKindLabel?.toLowerCase()}), planned and signed off before it departs; a trailer carrying only them goes too. Their documents are checked again for the new dates.`,
        ]
      : []),
  option.changesRoute || option.delayMinutes > 0
    ? `The trip gets a new confirmed route version${
        option.delayMinutes > 0
          ? `, with the stops not yet reached ${duration(option.delayMinutes)} later`
          : ''
      }, and the documents are checked again for the new arrival.`
    : 'The route and the times stay as they are.',
  option.extraCost > 0
    ? charge
      ? `${money(incident.currency, option.extraCost)} is added to ${incident.jobCode}’s final invoice.`
      : `EquiFreight pays the ${money(incident.currency, option.extraCost)}; the customer isn’t charged.`
    : 'It costs nothing extra.',
  `The customer gets your message as written; ${
    incident.coordinatorName ?? 'the coordinator'
  } and the crew are told.`,
];

/**
 * The logistics manager's decision on the proposed option (US-F5-03): what will happen, the message to the customer
 * (required, sent as written) and the one gold action. Sending it back asks for another proposal.
 */
export function IncidentDecision({
  incident,
  option,
}: {
  incident: Incident;
  option: IncidentOption;
}) {
  const { message } = App.useApp();
  const [returning, setReturning] = useState(false);
  const decide = useDecideIncident(incident.id);
  const methods = useFormCustom<DecideForm>({
    resolver: zodResolver(decideSchema),
    defaultValues: {
      customerMessage: '',
      note: '',
      chargeCustomer: option.extraCost > 0 && option.customerPays,
    },
  });
  const charge = useWatch({ control: methods.control, name: 'chargeCustomer' }) ?? false;

  const onSubmit = methods.handleSubmit((v) =>
    decide.mutate(
      {
        optionId: option.id,
        customerMessage: v.customerMessage,
        note: v.note || undefined,
        chargeCustomer: option.extraCost > 0 && v.chargeCustomer,
      },
      { onSuccess: () => message.success('Decided. The customer has your message.') },
    ),
  );

  return (
    <Panel title={`Decide: ${option.title}`}>
      <Flex vertical gap={16}>
        <ul className="type-body-m m-0 flex list-disc flex-col gap-1 pl-5 text-ink-2">
          {consequences(incident, option, charge).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <FormWrapper
          methods={methods}
          isSubmitting={decide.isPending}
          mode="edit"
          onFinish={onSubmit}
          layout="vertical"
          force
        >
          {({ FormField }) => (
            <>
              {option.extraCost > 0 && (
                <FormField
                  name="chargeCustomer"
                  component="checkbox"
                  componentProps={{
                    children: `The customer pays the ${money(incident.currency, option.extraCost)}`,
                  }}
                />
              )}
              <FormField
                name="customerMessage"
                label="Message to the customer (sent as written)"
                component="textarea"
                componentProps={{ rows: 4, maxLength: 1000, isRequired: true }}
              />
              <FormField
                name="note"
                label="Note for the record (optional)"
                component="textarea"
                componentProps={{ rows: 2, maxLength: 1000 }}
              />
              {decide.isError && (
                <Callout tone="bad" title="Not decided">
                  {apiErrorMessage(decide.error, 'Something went wrong. Try again.')}
                </Callout>
              )}
              <Flex justify="end" gap={8}>
                <Button
                  type="button"
                  disabled={decide.isPending}
                  onClick={() => setReturning(true)}
                >
                  Send back
                </Button>
                <SubmitButton label="Approve and tell the customer" />
              </Flex>
            </>
          )}
        </FormWrapper>
      </Flex>
      <ReturnModal incident={incident} open={returning} onClose={() => setReturning(false)} />
    </Panel>
  );
}

/** A decided incident: what was approved, by whom, what the customer was told and what it changed. */
export function IncidentDecided({ incident }: { incident: Incident }) {
  const option = incident.options.find((o) => o.id === incident.decidedOptionId);
  return (
    <Panel title="Decision">
      <Flex vertical gap={12}>
        <p className="type-body-m m-0 text-ink">
          {incident.decidedByName ?? 'The logistics manager'} approved “
          {option?.title ?? 'an option'}” {formatTime(incident.decidedAt)}.
        </p>
        {incident.decisionNote && (
          <p className="type-body-s m-0 text-ink-2">Note: {incident.decisionNote}</p>
        )}
        {incident.customerMessage && (
          <Flex vertical gap={4}>
            <span className="type-caption text-ink-3">The customer was told</span>
            <blockquote className="type-body-m m-0 border-l-2 border-line-strong pl-4 text-ink">
              {incident.customerMessage}
            </blockquote>
          </Flex>
        )}
        <ul className="type-body-s m-0 flex list-disc flex-col gap-1 pl-5 text-ink-2">
          {incident.newTripCode && (
            <li>{`The leaving horses travel on ${incident.newTripCode}, to be planned on the job page.`}</li>
          )}
          <li>
            {incident.routePlanVersion
              ? `Route version ${incident.routePlanVersion} confirmed, with the new times.`
              : 'The route and the times stayed as they were.'}
          </li>
          <li>
            {incident.chargedAmount
              ? `${money(incident.currency, incident.chargedAmount)} added to ${incident.jobCode}’s final invoice.`
              : option && option.extraCost > 0
                ? `EquiFreight pays the ${money(incident.currency, option.extraCost)}.`
                : 'No extra cost.'}
          </li>
        </ul>
      </Flex>
    </Panel>
  );
}
