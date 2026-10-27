import type { FC } from 'react';

import { HorseSwatches } from './HorseSwatches';

import { DraftPass, type Tone } from '@/components/ui';
import type { Blocker, Horse, Route } from '@/interfaces';
import { passRows, routeEnds, type WizardValues } from '@/lib/utils';

export const DRAFT_SUB =
  'Not a quote. A logistics manager prices the move after review; the quotation is itemised and valid for 7 days.';

type Props = {
  values: WizardValues;
  /** The standing blockers ("too soon" on the pass); none once submitted. */
  live: Blocker[];
  route: Route | null;
  notRun: boolean;
  horses: Horse[];
  chip?: { tone: Tone; label: string };
  /** The indicative range ("$31,900 – $43,300"); null or absent shows a dash. */
  range?: string | null;
  rangeSub?: string;
  className?: string;
};

/** The request's pass (spec §4): the wizard's side column, and the confirmation's. */
export const RequestPass: FC<Props> = ({
  values,
  live,
  route,
  notRun,
  horses,
  chip,
  range,
  rangeSub,
  className,
}) => {
  const from = (route && routeEnds(route).from) ?? values.origin?.city ?? null;
  const to = (route && routeEnds(route).to) ?? values.destination?.city ?? null;
  const ids = values.horses.map((h) => h.horseId);
  return (
    <DraftPass
      className={className}
      chip={chip}
      from={from}
      to={to}
      mode={values.mode === 'AIR' && values.arrivalMode !== 'WINDOW' ? 'air' : 'road'}
      rows={[
        ids.length
          ? { label: 'Horses', value: <HorseSwatches ids={ids} horses={horses} /> }
          : { label: 'Horses', value: null, step: 1 },
        ...passRows(values, live, route, notRun),
      ]}
      range={notRun ? null : (range ?? null)}
      rangeSub={
        notRun && from && to
          ? `No range: we don't run ${from} → ${to} yet.`
          : (rangeSub ?? DRAFT_SUB)
      }
    />
  );
};
