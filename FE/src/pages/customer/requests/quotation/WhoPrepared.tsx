import type { FC } from 'react';
import { Flex } from 'antd';

import { Panel } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import { formatDate } from '@/lib/utils';

/** Who prepared the quotation, and when; asking about a line comes with messaging. */
export const WhoPrepared: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  if (!quotation.preparedBy) return null;
  const superseded = quotation.versions.find((v) => v.supersededReason)?.supersededReason;
  return (
    <Panel title="Who prepared it">
      <Flex vertical gap={4}>
        <span className="type-label-s text-ink">{`${quotation.preparedBy.name}, ${quotation.preparedBy.role}`}</span>
        <span className="type-body-s text-ink-3">
          {`Built this quotation from rate catalog v${quotation.pinnedVersionNo}${
            quotation.issuedAt ? ` on ${formatDate(quotation.issuedAt)}` : ''
          }${quotation.versionNo > 1 && superseded ? `, and re-issued it: ${superseded}` : '.'}`}
        </span>
      </Flex>
    </Panel>
  );
};
