import { type FC, useRef, useState } from 'react';
import { useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';

import { CheckResult, type Outcome } from './CheckResult';
import { FileCard } from './FileCard';
import { type DocumentUploadForm, documentUploadSchema, EMPTY_UPLOAD } from './schema';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { Button, Deadline, Panel } from '@/components/ui';
import { useSubmitCustomerDocument } from '@/hooks/clearance';
import { type ChecklistItem, RegulationRuleKindEnum, ValidityEnum } from '@/interfaces';
import { apiErrorMessage, DOCUMENT_ACCEPT, isOwedByCustomer, type ItemDeadline } from '@/lib/utils';

type Props = { item: ChecklistItem; requestId: string; deadline: ItemDeadline };

/**
 * Your file (US-F2-03, DESIGN.md "Document upload"): the file and its dates, then the automatic check's answer
 * directly under them. The dates are checked before the file is sent, so a refused file is never stored; a file
 * that passes or expires in transit is uploaded as the next version and nothing earlier is overwritten.
 */
export const UploadPanel: FC<Props> = ({ item, requestId, deadline }) => {
  const picker = useRef<HTMLInputElement>(null);
  const submit = useSubmitCustomerDocument(requestId);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const methods = useFormCustom<DocumentUploadForm>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: EMPTY_UPLOAD,
  });
  const { errors } = useFormState({ control: methods.control });
  const file = useWatch({ control: methods.control, name: 'file' });
  const sampled = item.ruleKind === RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE;
  const refused = outcome?.check?.validity === ValidityEnum.RED;

  const choose = (f: File | null) => {
    methods.setValue('file', f, { shouldValidate: true, shouldDirty: true });
    setOutcome(null);
  };

  const onSubmit = methods.handleSubmit(async (v) => {
    setOutcome(null);
    try {
      const check = await submit.mutateAsync({
        checklistItemId: item.id,
        file: v.file!,
        issuedOn: v.issuedOn,
        sampledOn: v.sampledOn || undefined,
        validUntil: v.validUntil,
        issuer: v.issuer.trim() || undefined,
      });
      setOutcome({ check, fileName: v.file!.name });
      // A stored version starts the form again; a refused one keeps its dates to correct.
      if (check.validity !== ValidityEnum.RED) methods.reset(EMPTY_UPLOAD);
    } catch (err) {
      setOutcome({ error: apiErrorMessage(err, 'The document could not be uploaded. Try again.') });
    }
  });

  return (
    <Panel>
      <FormWrapper
        methods={methods}
        isSubmitting={submit.isPending}
        mode="add"
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <div className="flex flex-col gap-4">
            <h2 className="type-h4 m-0 text-ink">Your file</h2>
            <input
              ref={picker}
              type="file"
              hidden
              accept={DOCUMENT_ACCEPT}
              aria-label="Choose the file to upload"
              onChange={(e) => {
                choose(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <FileCard
              file={file}
              refused={refused}
              error={errors.file?.message}
              onChoose={() => picker.current?.click()}
              onRemove={() => choose(null)}
            />
            <div className="grid grid-cols-2 gap-x-4">
              <FormField
                name="issuedOn"
                label="Issue date"
                component="datepicker"
                componentProps={{
                  isRequired: true,
                  maxDate: dayjs().endOf('day'),
                  instruction: 'As printed on the document.',
                }}
              />
              <FormField
                name="validUntil"
                label="Valid until"
                component="datepicker"
                componentProps={{
                  isRequired: true,
                  instruction: 'The expiry date printed on it, or the last day it covers.',
                }}
              />
              {sampled && (
                <FormField
                  name="sampledOn"
                  label="Sample date"
                  component="datepicker"
                  componentProps={{
                    maxDate: dayjs().endOf('day'),
                    instruction: 'For a test: the rule counts from the day it was sampled.',
                  }}
                />
              )}
              <FormField
                name="issuer"
                label="Issued by"
                component="text"
                componentProps={{ placeholder: 'e.g. NAVETCO Laboratory, Ho Chi Minh City' }}
              />
            </div>
            {outcome && <CheckResult outcome={outcome} />}
            <div className="flex items-center justify-between gap-4">
              <Deadline
                align="start"
                left={deadline.left}
                date={deadline.date}
                tone={deadline.tone}
              />
              {refused ? (
                <Button
                  variant="primary"
                  leadingIcon="upload"
                  onClick={() => picker.current?.click()}
                >
                  Choose another file
                </Button>
              ) : (
                <Button
                  // Gold only while the customer owes it (DESIGN.md: a passing file has no gold).
                  variant={isOwedByCustomer(item) ? 'primary' : 'secondary'}
                  type="submit"
                  leadingIcon="upload"
                  disabled={submit.isPending}
                >
                  {submit.isPending
                    ? 'Checking…'
                    : item.currentVersion
                      ? 'Check and upload a new version'
                      : 'Check and upload'}
                </Button>
              )}
            </div>
          </div>
        )}
      </FormWrapper>
    </Panel>
  );
};
