import type { FC } from 'react';
import { Col, Row } from 'antd';
import { useController } from 'react-hook-form';

import type { DelayAlertForm } from './delayAlertSchema';

import { OptionCard, type IconName } from '@/components/ui';

const REASONS: { value: DelayAlertForm['reason']; title: string; icon: IconName; text: string }[] =
  [
    { value: 'TRAFFIC', title: 'Traffic', icon: 'truck', text: 'A jam or a closed road ahead.' },
    { value: 'WEATHER', title: 'Bad weather', icon: 'alert', text: 'Rain, flooding or heat.' },
    {
      value: 'BORDER_CONGESTION',
      title: 'Border congestion',
      icon: 'shield',
      text: 'A queue at a crossing.',
    },
  ];

/** Why the trip is late, as radio option cards (US-F5-04). */
export const DelayReasonCards: FC = () => {
  const { field, fieldState } = useController<DelayAlertForm, 'reason'>({ name: 'reason' });
  return (
    <div>
      <Row gutter={[12, 12]}>
        {REASONS.map((r) => (
          <Col key={r.value} span={8}>
            <OptionCard
              type="radio"
              name="delay-reason"
              value={r.value}
              selected={field.value === r.value}
              onChange={(selected) => selected && field.onChange(r.value)}
              icon={r.icon}
              title={r.title}
              description={r.text}
              className="h-full"
            />
          </Col>
        ))}
      </Row>
      {fieldState.error && (
        <p className="type-body-s m-0 mt-2 text-bad">{fieldState.error.message}</p>
      )}
    </div>
  );
};
