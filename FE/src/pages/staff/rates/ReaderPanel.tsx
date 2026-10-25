import type { FC } from 'react';
import { Flex } from 'antd';

import { Panel } from '@/components/ui';
import type { RateCatalog } from '@/interfaces';

/**
 * In place of the draft panel for a reader who can't edit (the logistics manager, US-Q-04): the version
 * quotations are priced from, who keeps the catalog, and whether a draft is being prepared.
 */
export const ReaderPanel: FC<{ catalog: RateCatalog; hiddenDraft: boolean }> = ({
  catalog,
  hiddenDraft,
}) => {
  const current = catalog.versions.find((v) => v.id === catalog.currentVersionId);
  const draft = catalog.versions.find((v) => v.id === catalog.draftVersionId);
  return (
    <Panel>
      <Flex vertical gap={2}>
        <span className="type-h4 text-ink">{`Rate catalog v${current?.versionNo ?? ''} is current`}</span>
        <span className="type-body-s text-ink-2">
          Quotations are priced from this version. The transport specialist keeps the catalog.
        </span>
        {hiddenDraft && draft && (
          <span className="type-body-s text-ink-2">
            {`Draft v${draft.versionNo} is being prepared. Its changes reach quotations once it is published.`}
          </span>
        )}
      </Flex>
    </Panel>
  );
};
