import { type FC, useRef } from 'react';
import { useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Col, Flex, Row } from 'antd';
import dayjs from 'dayjs';

import { fileApi } from '@/apis/file';
import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { useUploadDocumentVersion } from '@/hooks/clearance';
import { type ChecklistItem, RegulationRuleKindEnum } from '@/interfaces';
import { apiErrorMessage, DOCUMENT_ACCEPT } from '@/lib/utils';
import { FileCard } from '@/pages/customer/requests/document/FileCard';
import {
  type DocumentUploadForm,
  documentUploadSchema,
  EMPTY_UPLOAD,
} from '@/pages/customer/requests/document/schema';

/**
 * A new version of a checklist document, uploaded by staff: the same file card, dates and checks
 * as the customer's upload (US-F2-03). The file is stored first, then attached as the item's next
 * version, which checks its validity; nothing earlier is overwritten.
 */
export const UploadForm: FC<{ item: ChecklistItem; jobId: string | null; onClose: () => void }> = ({
  item,
  jobId,
  onClose,
}) => {
  const picker = useRef<HTMLInputElement>(null);
  const upload = useUploadDocumentVersion(jobId);
  const methods = useFormCustom<DocumentUploadForm>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: EMPTY_UPLOAD,
  });
  const { errors, isSubmitting } = useFormState({ control: methods.control });
  const file = useWatch({ control: methods.control, name: 'file' });
  // A test counts from the day it was sampled (a window before departure).
  const sampled = item.ruleKind === RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE;

  const choose = (f: File | null) =>
    methods.setValue('file', f, { shouldValidate: true, shouldDirty: true });

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      const stored = await fileApi.upload(v.file!);
      await upload.mutateAsync({
        checklistItemId: item.id,
        data: {
          fileId: stored.id,
          issuedOn: v.issuedOn,
          sampledOn: v.sampledOn || undefined,
          validUntil: v.validUntil,
          issuer: v.issuer.trim() || undefined,
        },
      });
      onClose();
    } catch (err: unknown) {
      methods.setError('form_error', {
        message: apiErrorMessage(err, 'The document couldn’t be uploaded. Try again.'),
      });
    }
  });

  return (
    <FormWrapper
      methods={methods}
      isSubmitting={isSubmitting || upload.isPending}
      mode="add"
      onCancel={onClose}
      onFinish={onSubmit}
      layout="vertical"
    >
      {({ FormField }) => (
        <Flex vertical gap={16}>
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
            refused={false}
            error={errors.file?.message}
            onChoose={() => picker.current?.click()}
            onRemove={() => choose(null)}
          />
          <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <FormField
                name="validUntil"
                label="Valid until"
                component="datepicker"
                componentProps={{
                  isRequired: true,
                  instruction: 'The expiry date printed on it, or the last day it covers.',
                }}
              />
            </Col>
            {sampled && (
              <Col span={12}>
                <FormField
                  name="sampledOn"
                  label="Sample date"
                  component="datepicker"
                  componentProps={{
                    maxDate: dayjs().endOf('day'),
                    instruction: 'For a test: the rule counts from the day it was sampled.',
                  }}
                />
              </Col>
            )}
            <Col span={sampled ? 12 : 24}>
              <FormField
                name="issuer"
                label="Issued by"
                component="text"
                componentProps={{ placeholder: 'e.g. DAH Vietnam, USDA APHIS' }}
              />
            </Col>
          </Row>
          <Flex justify="end" gap={8}>
            <CancelButton label="Cancel" />
            <SubmitButton type="primary" label="Upload and check" />
          </Flex>
        </Flex>
      )}
    </FormWrapper>
  );
};
