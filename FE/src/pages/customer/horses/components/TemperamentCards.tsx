import { type FC } from 'react';
import { useController } from 'react-hook-form';
import { Col, Row } from 'antd';

import type { HorseFormShape } from './HorseForm';

import { OptionCard } from '@/components/ui';
import { type Temperament, TemperamentEnum } from '@/interfaces';

const TEMPERAMENT_CARDS: {
  value: Temperament;
  title: string;
  description: string;
  meta: string;
}[] = [
  {
    value: TemperamentEnum.CALM,
    title: 'Calm',
    description: 'Loads with a standard team.',
    meta: 'Standard stall',
  },
  {
    value: TemperamentEnum.NERVOUS,
    title: 'Nervous',
    description: 'Loaded slowly, away from the ramp.',
    meta: 'Quiet position',
  },
  {
    value: TemperamentEnum.AGGRESSIVE,
    title: 'Aggressive',
    description: 'Experienced handlers only.',
    meta: 'Box stall',
  },
];

/** Calm, Nervous or Aggressive, as radio option cards. */
export const TemperamentCards: FC = () => {
  const { field } = useController<HorseFormShape, 'temperament'>({ name: 'temperament' });
  return (
    <Row gutter={[12, 12]}>
      {TEMPERAMENT_CARDS.map((card) => (
        <Col key={card.value} span={8}>
          <OptionCard
            type="radio"
            name="temperament"
            value={card.value}
            selected={field.value === card.value}
            onChange={(selected) => selected && field.onChange(card.value)}
            title={card.title}
            description={card.description}
            meta={card.meta}
          />
        </Col>
      ))}
    </Row>
  );
};
