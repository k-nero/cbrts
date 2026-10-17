import type { FC } from 'react';

import { FactGrid } from './FactGrid';

import { Icon } from '@/components/ui';
import type { Horse } from '@/interfaces';
import { formatDay, formatMicrochip, pronouns, sexLabel } from '@/lib/utils';

/**
 * The identity fixed by the passport once the horse was on a submitted request (backend H-07): shown,
 * never edited here (frame: My horses · Nightfall · Edit).
 */
const PassportPanel: FC<{ horse: Horse }> = ({ horse }) => (
  <section className="flex flex-col gap-2.5 rounded-lg border border-line bg-sunken p-6">
    <div className="flex items-center gap-2 text-ink-2">
      <Icon name="lock" size={16} />
      <h4 className="type-label-m m-0 text-ink">From {pronouns(horse.sex).possessive} passport</h4>
    </div>
    <FactGrid
      facts={[
        { label: 'Name', value: horse.name },
        { label: 'Microchip', value: formatMicrochip(horse.microchip), mono: true },
        { label: 'Sex', value: sexLabel(horse.sex) },
        { label: 'Breed', value: horse.breed ?? '—' },
        {
          label: 'Date of birth',
          value: formatDay(horse.dateOfBirth),
          mono: true,
        },
        {
          label: 'Coat',
          value: horse.coat ? horse.coat.charAt(0) + horse.coat.slice(1).toLowerCase() : '—',
        },
      ]}
    />
    <p className="type-body-s m-0 text-ink-3">
      These can’t be edited here. Ask the transport specialist to correct them against the passport.
    </p>
  </section>
);

export default PassportPanel;
