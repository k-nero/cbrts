import { type FC, useRef, useState } from 'react';
import type { AxiosError } from 'axios';

import { RequestSummary } from '../components/RequestSummary';

import type { StepProps } from '.';

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
    router.replace(router.paths.get('request-submitted', { pathParams: [saved.id] }), {
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
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
              {refusal.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
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
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {blockers.map((b) => {
              const step = stepOfBlocker(b);
              return (
                <li
                  key={`${b.code}:${b.message}`}
                  className="flex items-center justify-between gap-4"
                >
                  <span>{b.message}</span>
                  <Button size="sm" variant="ghost" onClick={() => goTo(step)}>
                    Go to step {WIZARD_STEPS.indexOf(step) + 1}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Callout>
      )}

      <Panel title="What happens next">
        <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
          {NEXT.map(([what, when], i) => (
            <li key={what} className="flex items-center gap-3.5">
              <span className="type-caption grid size-6.5 shrink-0 place-items-center rounded-full border border-line-strong text-ink-3">
                {i + 1}
              </span>
              <span className="type-label-m flex-1 text-ink">{what}</span>
              <span className="type-caption text-ink-3">{when}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="flex items-center justify-between border-t border-line pt-5">
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
      </div>
    </>
  );
};

export default ReviewStep;
