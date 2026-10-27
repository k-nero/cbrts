import { type FC, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { App, Flex } from 'antd';
import type { AxiosError } from 'axios';

import { afterReturn } from './afterReturn';
import { ApprovePanel } from './ApprovePanel';
import { JobPanel } from './JobPanel';
import { NoteField } from './NoteField';
import { QuotationAction } from './QuotationAction';
import { fleetShort } from './fleetCheck';
import { RejectBox } from './RejectBox';
import { type NoteForm, noteSchema } from './schema';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { Button, Callout, Chip, Panel } from '@/components/ui';
import { queryKeys } from '@/constant/query';
import { useReturnRequest } from '@/hooks/staffRequest';
import type { ApiError, RequestReview } from '@/interfaces';
import {
  apiErrorMessage,
  formatDate,
  inReview,
  NOTE_MAX,
  noteState,
  rejectable,
  requestStatusChip,
  restingPanel,
} from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * The decision (spec §5.2): in review, ask for information, start the quotation or reject; once the
 * customer accepts, approve into a job or reject (US-F1-07); while quoted, reject (BR-F1-04); once
 * approved, the job and its team; once expired with a re-quote in draft, the draft to issue (A4). After a
 * return, the page opens the next request the queue held before it, or goes back to Requests.
 */
export const DecisionPanel: FC<{ review: RequestReview }> = ({ review }) => {
  const router = useCustomRouter();
  const send = useReturnRequest();
  const qc = useQueryClient();
  const { message } = App.useApp();
  const methods = useFormCustom<NoteForm>({
    resolver: zodResolver(noteSchema),
    mode: 'onChange',
    defaultValues: { note: '' },
  });
  const note = useWatch({ control: methods.control, name: 'note' }) ?? '';
  /** A 409's sentence and the note that wasn't sent, kept after the refetch turns the panel read-only. */
  const [conflict, setConflict] = useState<{ sentence: string; unsent: string } | null>(null);
  /** A send that got no answer: whether it landed is the refetch's to say, so this shows only while open. */
  const [failure, setFailure] = useState<string | null>(null);
  /** A send in flight: a second click queued behind the first sends nothing. */
  const sending = useRef(false);
  const { request } = review;
  const state = noteState(note);

  const conflictCallout = conflict && (
    <Callout tone="bad" title={conflict.sentence}>
      {conflict.unsent && (
        <Flex component="span" vertical gap={4}>
          <span>Your note wasn&apos;t sent:</span>
          <span className="whitespace-pre-line text-ink">{conflict.unsent}</span>
        </Flex>
      )}
    </Callout>
  );

  if (request.status === 'CUSTOMER_ACCEPTED') return <ApprovePanel review={review} />;
  if (request.status === 'APPROVED' && review.job) return <JobPanel job={review.job} />;

  if (!inReview(request.status)) {
    const chip = requestStatusChip(request.status);
    const returned = review.revisions[review.revisions.length - 1];
    const resting = restingPanel(review);
    return (
      <Panel title={resting.title} extra={<Chip tone={chip.tone}>{chip.label}</Chip>}>
        <Flex vertical gap={16}>
          {conflictCallout}
          {resting.requote ? (
            <p className="type-body-s m-0 text-ink-2">{resting.requote}</p>
          ) : request.infoRequiredNote ? (
            <Flex vertical gap={4}>
              <p className="type-label-s m-0 text-ink-2">
                Returned{returned?.returnedAt ? ` ${formatDate(returned.returnedAt)}` : ''} with:
              </p>
              <p className="type-body-s m-0 whitespace-pre-line text-ink">
                {request.infoRequiredNote}
              </p>
            </Flex>
          ) : request.rejectReason ? (
            <Flex vertical gap={4}>
              <p className="type-label-s m-0 text-ink-2">Rejected with:</p>
              <p className="type-body-s m-0 whitespace-pre-line text-ink">{request.rejectReason}</p>
            </Flex>
          ) : (
            <p className="type-body-s m-0 text-ink-2">
              This request isn&apos;t waiting for review.
            </p>
          )}
          <QuotationAction review={review} primary={resting.requote !== null} />
          {/* A quoted request can still be turned down before approval (BR-F1-04, A7). */}
          {rejectable(request.status) && <RejectBox review={review} />}
        </Flex>
      </Panel>
    );
  }

  const onSend = async ({ note: sent }: NoteForm) => {
    if (sending.current) return;
    sending.current = true;
    setConflict(null);
    setFailure(null);
    const next = afterReturn(review.queue?.nextId);
    try {
      await send.mutateAsync({ id: request.id, note: sent });
      void message.success(`Returned ${request.code} to ${request.club}.`);
      methods.reset({ note: '' });
      if (next.to === 'request-review')
        router.push(router.paths.get('request-review', { pathParams: [next.id] }), {
          force: true,
        });
      else router.push(router.paths.get('requests'), { force: true });
    } catch (error) {
      const response = (error as AxiosError<Partial<ApiError>> | undefined)?.response;
      const sentence = apiErrorMessage(
        error,
        "The request wasn't returned. Check your connection and try again.",
      );
      if (response?.data?.error === 'NOTE_REQUIRED' || response?.data?.error === 'NOTE_TOO_LONG') {
        methods.setError('note', { type: 'server', message: sentence });
        return;
      }
      // Someone else decided first: the note certainly wasn't sent. Without an answer it may have been,
      // so the refetched status says which: read-only if it landed, the note still here if not.
      if (response?.status === 409) setConflict({ sentence, unsent: sent });
      else setFailure(sentence);
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.one(request.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.queues() });
    } finally {
      sending.current = false;
    }
  };

  return (
    <Panel title="Your decision">
      <Flex vertical gap={16}>
        <p className="type-body-s m-0 text-ink-2">
          Ask the customer before quoting, or start the quotation.
        </p>
        {conflictCallout}
        {failure && <Callout tone="bad" title={failure} />}
        <div className="p-4 rounded-md border border-line-strong bg-raised">
          <Flex vertical gap={12}>
            <span className="type-label-m text-ink">Ask for information</span>
            <FormWrapper methods={methods} isSubmitting={send.isPending} layout="vertical">
              <NoteField club={request.club} />
            </FormWrapper>
            <span
              className={`type-caption self-end ${state.length > NOTE_MAX ? 'text-bad' : 'text-ink-3'}`}
            >
              {state.count}
            </span>
            <Button
              variant="primary"
              trailingIcon="arrow-right"
              disabled={!state.ok || send.isPending}
              onClick={() => void methods.handleSubmit(onSend)()}
            >
              Send to customer
            </Button>
          </Flex>
        </div>
        <div className="pt-4 border-t border-line">
          <Flex vertical gap={8}>
            <span className="type-label-s text-ink-2">Other outcomes</span>
            {fleetShort(review.fleet) && (
              <span className="type-body-s text-warn">
                No vehicle can run this by the fleet calendar. You can still quote it.
              </span>
            )}
            <QuotationAction review={review} />
            <RejectBox review={review} />
          </Flex>
        </div>
      </Flex>
    </Panel>
  );
};
