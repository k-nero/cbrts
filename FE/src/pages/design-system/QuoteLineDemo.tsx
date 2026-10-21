import { FC } from 'react';

import { QuoteLine as QL } from '@/components/ui';

/** Kept apart so the quotation demo reads as one ledger. */
export const QuoteLineDemo: FC = () => (
  <>
    <QL
      certainty="fixed"
      description="Road transport, private trailer"
      basis="per km · 960 km"
      qty="960"
      rate="$4.20"
      amount="$4,032.00"
    />
    <QL
      certainty="estimated"
      description="Border waiting time"
      basis="per started hour"
      qty="2"
      rate="$95.00"
      amount="$190.00"
      note="Billed on the actual wait; queues at Mộc Bài run 1 to 3 hours."
    />
    <QL
      certainty="overridden"
      description="Pre-export isolation · Nightfall"
      basis="per day · 14 days"
      qty="14"
      rate="$18.00"
      amount="$252.00"
      catalogAmount="$300.00"
      note="Club's own isolation barn, inspected 1 Oct."
    />
    <QL
      certainty="fixed"
      description="Flight vet"
      basis="per shipment"
      qty="1"
      rate={null}
      amount={null}
    />
  </>
);
