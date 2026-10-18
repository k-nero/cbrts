import { type FC, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';
import { z } from 'zod';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Button, Panel } from '@/components/ui';
import { useCreateRateDraft, useDiscardRateDraft, usePublishRateDraft } from '@/hooks/rates';
import type { RateCatalog } from '@/interfaces';
import { apiErrorMessage, formatDayTime } from '@/lib/utils';

const NOTE_MAX = 500;
const schema = z.object({
  changeNote: z
    .string()
    .trim()
    .min(1, 'Say what changed in this version.')
    .max(NOTE_MAX, `The change note must be ${NOTE_MAX} characters or fewer.`),
});
type PublishForm = z.infer<typeof schema>;

type Props = {
  catalog: RateCatalog;
  /** A write found no draft: the page says so and reloads. */
  onDraftGone: (error: unknown) => boolean;
};

/**
 * The draft panel (DESIGN.md, Rate catalog): with no draft, Lan creates one from the current version;
 * with a draft, she discards it or publishes it as the next version, with a note.
 */
export const DraftPanel: FC<Props> = ({ catalog, onDraftGone }) => {
  const { message, modal } = App.useApp();
  const create = useCreateRateDraft();
  const discard = useDiscardRateDraft();
  const publish = usePublishRateDraft();
  const [publishing, setPublishing] = useState(false);
  const methods = useFormCustom<PublishForm>({ resolver: zodResolver(schema) });

  const draft = catalog.versions.find((v) => v.id === catalog.draftVersionId);
  const current = catalog.versions.find((v) => v.id === catalog.currentVersionId);
  const nextNo = (catalog.versions[0]?.versionNo ?? 0) + 1;

  useEffect(() => {
    if (publishing) methods.reset({ changeNote: '' });
  }, [methods, publishing]);

  const onCreate = async () => {
    try {
      await create.mutateAsync();
      message.success(`Draft v${nextNo} created`);
    } catch (error) {
      message.error(apiErrorMessage(error, "The draft wasn't created. Try again."));
    }
  };

  const onDiscard = () =>
    modal.confirm({
      title: `Discard draft v${draft?.versionNo}?`,
      content: 'Every change in the draft is lost. The current version stays as it is.',
      okText: 'Discard draft',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: async () => {
        try {
          await discard.mutateAsync();
          message.success('Draft discarded');
        } catch (error) {
          if (!onDraftGone(error))
            message.error(apiErrorMessage(error, "The draft wasn't discarded."));
        }
      },
    });

  const onPublish = methods.handleSubmit(async (values) => {
    try {
      await publish.mutateAsync(values.changeNote);
      message.success(`Rate catalog v${draft?.versionNo} published`);
      setPublishing(false);
    } catch (error) {
      if (onDraftGone(error)) {
        setPublishing(false);
        return;
      }
      methods.setError('form_error', {
        message: apiErrorMessage(error, "The draft wasn't published. Try again."),
      });
    }
  });

  if (!draft) {
    return (
      <Panel>
        <Flex align="center" justify="space-between" gap={16}>
          <span className="flex flex-col gap-0.5">
            <span className="type-h4 text-ink">{`Rate catalog v${current?.versionNo ?? ''} is current`}</span>
            <span className="type-body-s text-ink-2">
              Changes are made in a draft and published as the next version.
            </span>
          </span>
          <Button variant="secondary" disabled={create.isPending} onClick={() => void onCreate()}>
            {`Create draft v${nextNo}`}
          </Button>
        </Flex>
      </Panel>
    );
  }

  const pinned = current?.quotationsPinned ?? 0;
  return (
    <Panel>
      <Flex align="center" justify="space-between" gap={16}>
        <span className="flex flex-col gap-0.5">
          <span className="type-h4 text-ink">{`Draft v${draft.versionNo}`}</span>
          <span className="type-body-s text-ink-2">
            {draft.lastEditedBy && draft.updatedAt
              ? `Edited by ${draft.lastEditedBy}, ${formatDayTime(draft.updatedAt)}`
              : 'No changes yet'}
          </span>
        </span>
        <Flex gap={12} align="center">
          <Button variant="ghost" onClick={onDiscard}>
            Discard draft
          </Button>
          <Button leadingIcon="upload" onClick={() => setPublishing(true)}>
            {`Publish v${draft.versionNo}`}
          </Button>
        </Flex>
      </Flex>
      <BaseModal
        open={publishing}
        onCancel={() => setPublishing(false)}
        title={`Publish v${draft.versionNo}`}
      >
        <FormWrapper
          methods={methods}
          isSubmitting={publish.isPending}
          mode="add"
          onCancel={() => setPublishing(false)}
          onFinish={onPublish}
          layout="vertical"
        >
          {({ FormField }) => (
            <>
              <p className="type-body-s m-0 mb-4 text-ink-2">
                {`Publishing makes v${draft.versionNo} the rates for new quotations. ${
                  pinned === 1
                    ? `The 1 quotation pinned to v${current?.versionNo ?? ''} keeps its price.`
                    : `The ${pinned} quotations pinned to v${current?.versionNo ?? ''} keep their prices.`
                }`}
              </p>
              <FormField
                name="changeNote"
                label="What changed"
                component="textarea"
                componentProps={{ isRequired: true, maxLength: NOTE_MAX, rows: 3 }}
              />
              <Flex justify="end" gap={8}>
                <CancelButton label="Cancel" />
                <SubmitButton type="primary" label={`Publish v${draft.versionNo}`} />
              </Flex>
            </>
          )}
        </FormWrapper>
      </BaseModal>
    </Panel>
  );
};
