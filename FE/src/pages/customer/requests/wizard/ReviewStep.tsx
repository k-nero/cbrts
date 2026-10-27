import { type FC, useRef, useState } from 'react';
import { Flex } from 'antd';
import type { AxiosError } from 'axios';

import type { StepProps } from './WizardForm';

import { RequestSummary } from '@/components/request/RequestSummary';
import { Button, Callout, Panel } from '@/components/ui';
import { useRequest, useSubmitRequest } from '@/hooks/request';
import type { ApiError } from '@/interfaces';
import { apiErrorMessage, reviewRows, stepOfBlocker, submitLabel, WIZARD_STEPS } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

const NEXT: [string, string][] = [
  ['Request: a logistics manager reviews it', 'Usually within 1 business day'],
  ['Quotation: itemised line by line', 'Valid for 7 days'],
  ['Approval: you accept; the 30% deposit is acknowledged', 'The job gets its CBRT code'],
  ['Documents: your checklist opens', 'Then Clearance, Trip and Handover'],
];

/** Step 4 (spec §5.5): what the customer is sending, what still stops it, and Submit. */
const ReviewStep: FC<StepProps> = ({ saved, saving, onBack, goTo }) => {
  const router = useCustomRouter();
  const submit = useSubmitRequest();
  const query = useRequest(saved?.id);
  const [refusal, setRefusal] = useState<{ title: string; details: string[] } | null>(null);
  /** A submit in flight: a second click queued behind the first sends nothing. */
  const submitting = useRef(false);
  if (!saved) return null;

  const blockers = saved.blockers ?? [];
  const lead = saved.leadTime;
  // A replace, so Back from the confirmation doesn't land on the draft's review again.
  const toConfirmation = () =>
    router.replace(router.paths.get('request', { pathParams: [saved.id] }), {
      force: true,
    });

  const onSubmit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setRefusal(null);
    try {
      await submit.mutateAsync(saved.id);
      toConfirmation();
    } catch (error) {
      const data = (error as AxiosError<Partial<ApiError>> | undefined)?.response?.data;
      if (data?.error === 'REQUEST_NOT_DRAFT') return toConfirmation();
      const blocked = data?.error === 'SUBMISSION_BLOCKED';
      // The refetched draft lists its blockers under "Before you can submit": say them once.
      if (blocked) void query.refetch();
      setRefusal({
        title: apiErrorMessage(
          error,
          "Your request wasn't submitted. Check your connection and try again.",
        ),
        details: blocked ? [] : (data?.details ?? []),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      submitting.current = false;
    }
  };

  return (
    <>
      <h2 className="type-h3 m-0 text-ink">Review and submit</h2>

      {refusal && (
        <Callout tone="bad" title={refusal.title}>
          {refusal.details.length > 0 && (
            <div className="pl-5">
              <Flex component="ul" vertical gap={4} className="list-disc">
                {refusal.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </Flex>
            </div>
          )}
        </Callout>
      )}

      <RequestSummary rows={reviewRows(saved)} onEdit={goTo} />

      {lead?.met && (
        <Callout tone="ok" title="Lead time is fine">
          {saved.route?.crossBorder === false
            ? `Moves within one country need ${lead.requiredDays} days’ notice.`
            : `Cross-border moves need ${lead.requiredDays} days’ notice.`}{' '}
          Your departure is {lead.daysBeforeDeparture} days away.
        </Callout>
      )}

      {blockers.length > 0 && (
        <Callout tone="bad" title="Before you can submit">
          <Flex component="ul" vertical gap={8} className="list-none">
            {blockers.map((b) => {
              const step = stepOfBlocker(b);
              return (
                <Flex
                  component="li"
                  align="center"
                  justify="space-between"
                  gap={16}
                  key={`${b.code}:${b.message}`}
                >
                  <span>{b.message}</span>
                  <Button size="sm" variant="ghost" onClick={() => goTo(step)}>
                    Go to step {WIZARD_STEPS.indexOf(step) + 1}
                  </Button>
                </Flex>
              );
            })}
          </Flex>
        </Callout>
      )}

      <Panel title="What happens next">
        <Flex component="ol" vertical gap={14} className="list-none">
          {NEXT.map(([what, when], i) => (
            <Flex component="li" align="center" gap={14} key={what}>
              <Flex
                component="span"
                align="center"
                justify="center"
                className="type-caption size-6.5 shrink-0 rounded-full border border-line-strong text-ink-3"
              >
                {i + 1}
              </Flex>
              <span className="type-label-m flex-1 text-ink">{what}</span>
              <span className="type-caption text-ink-3">{when}</span>
            </Flex>
          ))}
        </Flex>
      </Panel>

      <div className="border-t border-line pt-5">
        <Flex align="center" justify="space-between">
          <Button leadingIcon="arrow-left" disabled={saving || submit.isPending} onClick={onBack}>
            Back
          </Button>
          <Button
            variant="primary"
            trailingIcon="arrow-right"
            disabled={blockers.length > 0 || submit.isPending}
            onClick={() => void onSubmit()}
          >
            {submitLabel(saved)}
          </Button>
        </Flex>
      </div>
    </>
  );
};

export default ReviewStep;
