import type { FC } from 'react';
import { App } from 'antd';
import { Button, Panel } from '@/components/ui';
import { useDiscardRegulationDraft, usePublishRegulationVersion } from '@/hooks/regulation';
import type { RegulationCatalog, RegulationVersion } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

type Props = {
  catalog?: RegulationCatalog;
  /** The draft version on screen. */
  draft: RegulationVersion;
  /** The number the draft publishes as. */
  draftVersionNo: number;
};

/** The draft's summary with its two decisions: publish it, or discard it. */
const DraftBanner: FC<Props> = ({ catalog, draft, draftVersionNo }) => {
  const { message } = App.useApp();
  const publish = usePublishRegulationVersion();
  const discard = useDiscardRegulationDraft();
  const draftId = catalog?.draftVersion?.id ?? draft.id;

  const publishDraft = async () => {
    try {
      await publish.mutateAsync(draftId);
      message.success(`Published regulation catalog v${draftVersionNo}`);
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, 'Failed to publish version'));
    }
  };

  const discardDraft = async () => {
    try {
      await discard.mutateAsync(draftId);
      message.success('Draft regulation version discarded');
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, 'Failed to discard draft'));
    }
  };

  // FIXME(mock): the 3/7 fallbacks and the "2 of them are flagged" sentence are Figma placeholders.
  const pinned = catalog?.activeVersion?.pinnedJobsCount ?? 3;
  const activeNo = catalog?.activeVersion?.versionNo ?? 7;

  return (
    <Panel className="border-warn/40 bg-card">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex max-w-2xl flex-col gap-1">
          <h4 className="type-h4 m-0 text-ink">
            Draft v{draft.versionNo} · {draft.changesCount ?? 3} changes
          </h4>
          <p className="type-body-s m-0 text-ink-2">
            Publishing makes v{draft.versionNo} the rules for new jobs. The {pinned} jobs pinned to
            v{activeNo} keep v{activeNo}; 2 of them are flagged for review under the new EIA window.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button variant="ghost" onClick={discardDraft} disabled={discard.isPending}>
            Discard draft
          </Button>
          <Button variant="primary" onClick={publishDraft} disabled={publish.isPending}>
            Publish v{draft.versionNo}
          </Button>
        </div>
      </div>
    </Panel>
  );
};

export default DraftBanner;
