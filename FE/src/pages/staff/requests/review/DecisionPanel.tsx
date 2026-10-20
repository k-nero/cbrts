import { type FC, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type { AxiosError } from 'axios';

import { afterReturn } from './afterReturn';
import { NoteField } from './NoteField';
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
  requestStatusChip,
} from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * The decision (spec §5.2): Ask for information is the one decision this slice has. After sending, the
 * page opens the next request the queue held before the return, or goes back to Requests.
 */
export const DecisionPanel: FC<{ review: RequestReview }> = ({ review }) => {
  const router = useCustomRouter();
  const send = useReturnRequest();
  const qc = useQueryClient();
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
        <span className="flex flex-col gap-1">
          <span>Your note wasn&apos;t sent:</span>
          <span className="whitespace-pre-line text-ink">{conflict.unsent}</span>
        </span>
      )}
    </Callout>
  );

  if (!inReview(request.status)) {
    const chip = requestStatusChip(request.status);
    const returned = review.revisions[review.revisions.length - 1];
    return (
      <Panel
        title={request.status === 'INFO_REQUIRED' ? 'Waiting for the customer' : 'Not in review'}
        extra={<Chip tone={chip.tone}>{chip.label}</Chip>}
      >
        <div className="flex flex-col gap-4">
          {conflictCallout}
          {request.infoRequiredNote ? (
            <div className="flex flex-col gap-1">
              <p className="type-label-s m-0 text-ink-2">
                Returned{returned?.returnedAt ? ` ${formatDate(returned.returnedAt)}` : ''} with:
              </p>
              <p className="type-body-s m-0 whitespace-pre-line text-ink">
                {request.infoRequiredNote}
              </p>
            </div>
          ) : (
            <p className="type-body-s m-0 text-ink-2">
              This request isn&apos;t waiting for review.
            </p>
          )}
        </div>
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
      <div className="flex flex-col gap-4">
        <p className="type-body-s m-0 text-ink-2">
          Ask the customer before quoting, or wait for the quotation step.
        </p>
        {conflictCallout}
        {failure && <Callout tone="bad" title={failure} />}
        <div className="flex flex-col gap-3 rounded-md border border-line-strong bg-raised p-4">
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
        </div>
        <div className="flex flex-col gap-1 border-t border-line pt-4">
          <span className="type-label-s text-ink-2">Other outcomes</span>
          <p className="type-body-s m-0 text-ink-3">
            Start quotation and Reject come with the quotation and approval steps.
          </p>
        </div>
      </div>
    </Panel>
  );
};
