import { type FC, useEffect, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type { AxiosError } from 'axios';

import { afterReturn } from './afterReturn';

import FormWrapper, { useFormCustom, useFormWrapperCtx } from '@/components/form/FormWrapper';
import { Button, Callout, Chip, Panel } from '@/components/ui';
import { queryKeys } from '@/constant/query';
import { useReturnRequest } from '@/hooks/staffRequest';
import type { ApiError, RequestReview } from '@/interfaces';
import { apiErrorMessage, formatDate, NOTE_MAX, noteState, requestStatusChip } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

type NoteForm = { note: string };

const NoteField: FC<{ club: string }> = ({ club }) => {
  const { FormField } = useFormWrapperCtx<NoteForm>();
  return (
    <FormField
      name="note"
      label={`Note to ${club}`}
      component="textarea"
      componentProps={{
        autoSize: { minRows: 4, maxRows: 10 },
        instruction:
          'Required. The customer sees it exactly as written; the request goes back to them with your note.',
      }}
    />
  );
};

/**
 * The decision (spec §5.2): Ask for information is the one decision this slice has. After sending, the
 * page opens the next request the queue held before the return, or goes back to Requests.
 */
export const DecisionPanel: FC<{ review: RequestReview }> = ({ review }) => {
  const router = useCustomRouter();
  const send = useReturnRequest();
  const qc = useQueryClient();
  const methods = useFormCustom<NoteForm>({ defaultValues: { note: '' } });
  const note = useWatch({ control: methods.control, name: 'note' }) ?? '';
  /** A 409's sentence and the note that wasn't sent, kept after the refetch turns the panel read-only. */
  const [conflict, setConflict] = useState<{ sentence: string; unsent: string } | null>(null);
  /** A send in flight: a second click queued behind the first sends nothing. */
  const sending = useRef(false);
  const { request } = review;
  const state = noteState(note);

  // A server refusal on the note is about the text that was sent: any change retires it.
  useEffect(() => {
    if (methods.getFieldState('note').error?.type === 'server') methods.clearErrors('note');
  }, [note, methods]);

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

  if (request.status !== 'SUBMITTED' && request.status !== 'UNDER_REVIEW') {
    const chip = requestStatusChip(request.status);
    const returned = review.revisions[review.revisions.length - 1];
    return (
      <Panel title="Waiting for the customer" extra={<Chip tone={chip.tone}>{chip.label}</Chip>}>
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

  const onSend = async () => {
    if (sending.current || !state.ok) return;
    sending.current = true;
    setConflict(null);
    const next = afterReturn(review.queue?.nextId);
    try {
      await send.mutateAsync({ id: request.id, note: note.trim() });
      void message.success(`Returned ${request.code} to ${request.club}.`);
      methods.reset({ note: '' });
      if (next.to === 'request-review')
        router.push(router.paths.get('request-review', { pathParams: [next.id] }), {
          force: true,
        });
      else router.push(router.paths.get('requests'), { force: true });
    } catch (error) {
      const data = (error as AxiosError<Partial<ApiError>> | undefined)?.response?.data;
      const sentence = apiErrorMessage(
        error,
        "The request wasn't returned. Check your connection and try again.",
      );
      if (data?.error === 'NOTE_REQUIRED' || data?.error === 'NOTE_TOO_LONG') {
        methods.setError('note', { type: 'server', message: sentence });
      } else {
        setConflict({ sentence, unsent: note.trim() });
        void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.one(request.id) });
      }
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
            onClick={() => void onSend()}
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
