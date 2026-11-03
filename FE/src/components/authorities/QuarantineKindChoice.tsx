import type { FC } from 'react';
import { Flex } from 'antd';
import { Radio } from '@/components/ui';
import { type QuarantineKind, QuarantineKindEnum } from '@/interfaces';
import { QUARANTINE_KIND_LABELS } from './labels';

type Props = { value?: QuarantineKind; onChange?: (kind: QuarantineKind) => void };

/** Before export or after arrival, as a Form.Item control. */
export const QuarantineKindChoice: FC<Props> = ({ value, onChange }) => (
  <Flex gap={16}>
    {Object.values(QuarantineKindEnum).map((kind) => (
      <Radio
        key={kind}
        name="quarantine-kind"
        label={QUARANTINE_KIND_LABELS[kind]}
        checked={value === kind}
        onChange={() => onChange?.(kind)}
      />
    ))}
  </Flex>
);
