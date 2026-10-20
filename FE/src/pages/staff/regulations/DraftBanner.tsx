import type { FC } from 'react';
import { App } from 'antd';
import { Button, Panel } from '@/components/ui';
import { useDiscardRegulationDraft, usePublishRegulationVersion } from '@/hooks/regulation';
import type { RegulationCatalog, RegulationVersion } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { changesLabel, pinnedJobsSentence } from './constants';

type Props = {
  catalog?: RegulationCatalog;
  /** The draft version on screen, as the version detail returns it (with its change count). */
  draft: RegulationVersion;
};

/** The draft's summary with its two decisions: publish it, or discard it. */
const DraftBanner: FC<Props> = ({ catalog, draft }) => {
  const { message } = App.useApp();
  const publish = usePublishRegulationVersion();
  const discard = useDiscardRegulationDraft();
  const active = catalog?.activeVersion;

  const publishDraft = async () => {
    try {
      await publish.mutateAsync(draft.id);
      message.success(`Published regulation catalog v${draft.versionNo}`);
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, 'Failed to publish version'));
    }
  };

  const discardDraft = async () => {
    try {
      await discard.mutateAsync(draft.id);
      message.success('Draft regulation version discarded');
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, 'Failed to discard draft'));
    }
  };

  return (
    <Panel className="border-warn/40 bg-card">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex max-w-2xl flex-col gap-1">
          <h4 className="type-h4 m-0 text-ink">
            Draft v{draft.versionNo} · {changesLabel(draft.changesCount)}
          </h4>
          <p className="type-body-s m-0 text-ink-2">
            Publishing makes v{draft.versionNo} the rules for new jobs.
            {active && ` ${pinnedJobsSentence(active.pinnedJobsCount, active.versionNo)}`}
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
