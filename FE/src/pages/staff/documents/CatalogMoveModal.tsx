import { type FC, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type CatalogMoveForm, catalogMoveSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useMoveToCatalogVersion } from '@/hooks/clearance';
import type { CatalogUpdate } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

type Props = {
  jobId: string;
  /** The update being applied; the modal is closed while it is null. */
  update: CatalogUpdate | null;
  onClose: () => void;
};

/** Confirms moving the job onto a newer catalog version, with the reason the audit log keeps. */
export const CatalogMoveModal: FC<Props> = ({ jobId, update, onClose }) => {
  const { message } = App.useApp();
  const move = useMoveToCatalogVersion();
  const methods = useFormCustom<CatalogMoveForm>({ resolver: zodResolver(catalogMoveSchema) });

  useEffect(() => {
    if (update) methods.reset({ reason: '' });
  }, [methods, update]);

  const onSubmit = methods.handleSubmit(async (v) => {
    if (!update) return;
    try {
      await move.mutateAsync({ jobId, data: { versionId: update.versionId, reason: v.reason } });
      message.success(`The job is on ${update.country} v${update.versionNo}`);
      onClose();
    } catch (error) {
      methods.setError('form_error', {
        message: apiErrorMessage(error, "The job wasn't moved. Try again."),
      });
    }
  });

  const title = update
    ? `Move to ${update.country} v${update.versionNo}`
    : 'Move to the new version';

  return (
    <BaseModal open={Boolean(update)} onCancel={onClose} title={title}>
      <FormWrapper
        methods={methods}
        isSubmitting={move.isPending}
        mode="add"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <p className="type-body-m m-0 mb-4 text-ink-2">
              New documents join the checklist, kept documents are checked again under the new
              rules, and documents the new version drops stay on the list without blocking the gate.
              No file is deleted. This can&apos;t be undone.
            </p>
            <FormField
              name="reason"
              label="Reason"
              component="textarea"
              componentProps={{
                isRequired: true,
                rows: 3,
                maxLength: 500,
                instruction: 'Kept in the audit log with the move.',
              }}
            />
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label={title} />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
