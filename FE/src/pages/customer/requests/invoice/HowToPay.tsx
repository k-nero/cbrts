import type { FC } from 'react';
import { Flex } from 'antd';

import { Panel } from '@/components/ui';
import type { Invoice } from '@/interfaces';

/** How to pay (DESIGN.md, Invoice): a bank transfer with the invoice code as the reference. */
export const HowToPay: FC<{ invoice: Invoice }> = ({ invoice }) => (
  <Panel title="How to pay">
    <Flex vertical gap={8}>
      <p className="type-body-m m-0 text-ink-2">
        By bank transfer, with <span className="type-data text-ink">{invoice.code}</span> as the
        reference. A payment is shown here once EquiFreight records it.
      </p>
      <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-4 gap-y-1">
        <dt className="type-caption text-ink-3">Account name</dt>
        <dd className="type-body-s m-0 text-ink">EquiFreight Co., Ltd.</dd>
        <dt className="type-caption text-ink-3">Bank</dt>
        <dd className="type-body-s m-0 text-ink">Placeholder: bank details to be confirmed</dd>
      </dl>
    </Flex>
  </Panel>
);
