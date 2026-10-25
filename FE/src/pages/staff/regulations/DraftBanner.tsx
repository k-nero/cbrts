import type { FC } from 'react';
import { App, Flex } from 'antd';
import { Button, Panel } from '@/components/ui';
import { useDiscardRegulationDraft, usePublishRegulationVersion } from '@/hooks/regulation';
import type { RegulationCountry, RegulationVersion } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { changesLabel, pinnedJobsSentence } from './constants';

type Props = {
  country: RegulationCountry;
  /** The draft version on screen, as the version detail returns it (with its change count). */
  draft: RegulationVersion;
  onEditParameters: () => void;
};

/** What publishing the draft does, said for this catalog: the first version, or the next one. */
const publishSentence = (country: RegulationCountry, draft: RegulationVersion) => {
  const active = country.catalog?.activeVersion;
  if (draft.rules.length === 0)
    return `Add the documents ${country.name} requires before publishing v${draft.versionNo}.`;
  if (!active)
    return `Publishing makes v${draft.versionNo} the first rules for ${country.name}: jobs into it can get a clearance checklist from then on.`;
  return `Publishing makes v${draft.versionNo} the rules for new jobs. ${pinnedJobsSentence(active.pinnedJobsCount, active.versionNo)}`;
};

/** The draft's summary with its decisions: change its parameters, discard it, or publish it. */
const DraftBanner: FC<Props> = ({ country, draft, onEditParameters }) => {
  const { message, modal } = App.useApp();
  const publish = usePublishRegulationVersion();
  const discard = useDiscardRegulationDraft();
  const firstVersion = !country.catalog?.activeVersion;

  const publishDraft = async () => {
    try {
      await publish.mutateAsync(draft.id);
      message.success(`Published v${draft.versionNo} of the ${country.name} catalog`);
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, "The version wasn't published. Try again."));
    }
  };

  const discardDraft = () =>
    modal.confirm({
      title: `Discard draft v${draft.versionNo}?`,
      content: firstVersion
        ? `${country.name} has no published version, so its catalog is left with no rules.`
        : `The published v${country.catalog?.activeVersion?.versionNo} stays as it is.`,
      okText: 'Discard draft',
      okButtonProps: { danger: true },
      cancelText: 'Keep it',
      onOk: async () => {
        try {
          await discard.mutateAsync(draft.id);
          message.success(`Draft v${draft.versionNo} discarded`);
        } catch (err: unknown) {
          message.error(apiErrorMessage(err, "The draft wasn't discarded. Try again."));
        }
      },
    });

  return (
    <Panel className="border-warn/40">
      <Flex align="center" justify="space-between" gap={16} wrap>
        <Flex vertical gap={4} className="max-w-2xl">
          <h4 className="type-h4 m-0 text-ink">
            Draft v{draft.versionNo} · {changesLabel(draft.changesCount)}
          </h4>
          <p className="type-body-s m-0 text-ink-2">{publishSentence(country, draft)}</p>
        </Flex>
        <Flex align="center" gap={12} wrap>
          <Button variant="ghost" onClick={onEditParameters}>
            Edit parameters
          </Button>
          <Button variant="ghost" onClick={discardDraft} disabled={discard.isPending}>
            Discard draft
          </Button>
          <Button
            variant="primary"
            onClick={publishDraft}
            disabled={publish.isPending || draft.rules.length === 0}
          >
            Publish v{draft.versionNo}
          </Button>
        </Flex>
      </Flex>
    </Panel>
  );
};

export default DraftBanner;
