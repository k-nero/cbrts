import { type FC, type ReactNode } from 'react';
import { useWatch } from 'react-hook-form';

import type { HorseFormShape } from './HorseForm';

/** The form's values as the side column reads them ("How he'll appear"). */
export const Side: FC<{ render: (values: HorseFormShape) => ReactNode }> = ({ render }) => {
  const values = useWatch<HorseFormShape>() as HorseFormShape;
  return <>{render(values)}</>;
};
