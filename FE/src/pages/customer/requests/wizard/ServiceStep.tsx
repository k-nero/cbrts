import type { FC, ReactNode } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';

import { Group, StepRefusal } from './parts';

import type { StepProps } from '.';

import { Button, Checkbox, Icon, OptionCard, Panel } from '@/components/ui';
import type { Estimate, RequestHorse, Route, ServiceClass } from '@/interfaces';
import {
  formatValue,
  groomsFor,
  optionMeta,
  pronouns,
  serviceLine,
  type WizardValues,
} from '@/lib/utils';

const CLASSES: { value: ServiceClass; title: string }[] = [
  { value: 'ECONOMY', title: 'Economy' },
  { value: 'BUSINESS', title: 'Business' },
  { value: 'FIRST', title: 'First' },
];

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** "Door to door by trailer · ~960 km · 2 border crossings." */
const roadLine = (r: Route | undefined) => {
  if (!r) return 'Door to door by trailer.';
  const km = r.distanceKm === null ? '' : ` · ~${r.distanceKm.toLocaleString('en-US')} km`;
  const borders = r.crossings.length
    ? plural(r.crossings.length, 'border crossing')
    : 'no border crossing';
  return `Door to door by trailer${km} · ${borders}.`;
};

const airLine = (r: Route | undefined) =>
  r?.distanceKm ? `By air · ~${r.distanceKm.toLocaleString('en-US')} km.` : 'By air.';

/** A row that is set by a profile or a rule, not chosen: a lock or a fixed tick, then the rule. */
const FactRow: FC<{ lead: ReactNode; title: string; sub: string; first?: boolean }> = ({
  lead,
  title,
  sub,
  first,
}) => (
  <div className={`flex items-center gap-3.5 px-4.5 py-3.5 ${first ? '' : 'border-t border-line'}`}>
    {lead}
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="type-label-m text-ink">{title}</span>
      <span className="type-body-s text-ink-3">{sub}</span>
    </span>
  </div>
);

const Lock = () => (
  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-ink-2">
    <Icon name="lock" size={14} />
  </span>
);

const Fixed = () => (
  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
    <Icon name="check" size={14} />
  </span>
);

const stallRow = (h: RequestHorse, i: number) => {
  const name = `${h.name}${h.withFoal ? ', with foal at foot' : ''}`;
  if (h.requiredStall === 'STANDARD')
    return (
      <FactRow
        key={h.horseId}
        first={i === 0}
        lead={<span className="size-7 shrink-0 rounded-full bg-muted" />}
        title={`${name} · standard stall`}
        sub={h.sizeClassCode ? `Size ${h.sizeClassCode}.` : 'Standard stall.'}
      />
    );
  const p = pronouns(h.sex);
  return (
    <FactRow
      key={h.horseId}
      first={i === 0}
      lead={<Lock />}
      title={`${name} · ${h.requiredStall === 'CLIMATE' ? 'climate-controlled stall' : 'box stall'}`}
      sub={`Required by ${p.possessive} profile. It can’t be removed while ${p.subject} travels.`}
    />
  );
};

/** Step 3 (spec §5.4): how the horses travel, the stalls their profiles set, extras, insurance. */
const ServiceStep: FC<StepProps> = ({
  estimate,
  saved,
  live,
  routes,
  saving,
  held,
  refusal,
  onContinue,
  onBack,
}) => {
  const { control, setValue } = useFormContext<WizardValues>();
  /** How a choice moves the estimate, for its card's Meta line (DESIGN.md, Service step). */
  const fx = (group: keyof Estimate['options'], value: string) =>
    estimate?.options[group].find((o) => o.value === value);
  const values = useWatch({ control }) as WizardValues;
  const { errors } = useFormState({ control, name: 'mode' });
  const set = <K extends keyof WizardValues>(name: K, value: WizardValues[K]) =>
    setValue(name, value as never, { shouldDirty: true });

  const window = values.arrivalMode === 'WINDOW';
  const road = routes.find((r) => r.mode === 'ROAD');
  const air = routes.find((r) => r.mode === 'AIR');
  const known = routes.length > 0;
  const from = values.origin?.city ?? '';
  const to = values.destination?.city ?? '';
  const mode = window ? 'ROAD' : values.mode;
  const horses = saved?.horses ?? [];
  const declared = horses.reduce((sum, h) => sum + (h.declaredValue ?? 0), 0);

  const errorOf = (field: string) => live.find((b) => b.field === field)?.message ?? undefined;
  const modeError = errorOf('mode') ?? (errors.mode?.message as string | undefined);

  const airReason = window
    ? 'An arrival window (step 2) needs road.'
    : known && !air
      ? `No equine air service ${from} → ${to}.`
      : undefined;
  const roadReason = known && !road ? `No road service ${from} → ${to}.` : undefined;

  const chooseMode = (next: 'ROAD' | 'AIR') => {
    set('mode', next);
    if (next === 'AIR') set('trailer', null);
    else set('airClass', null);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="type-h3 m-0 text-ink">How should they travel?</h2>
        <p className="type-body-m m-0 text-ink-2">
          Each choice is priced line by line on the quotation after review.
        </p>
      </div>

      <Group title="Mode" error={modeError}>
        <div className="grid grid-cols-2 gap-4">
          <OptionCard
            name="mode"
            value="ROAD"
            icon="truck"
            selected={mode === 'ROAD'}
            disabled={Boolean(roadReason)}
            onChange={() => chooseMode('ROAD')}
            title="Road"
            description={roadLine(road)}
            meta={optionMeta(fx('mode', 'ROAD'), roadReason)}
          />
          <OptionCard
            name="mode"
            value="AIR"
            icon="plane"
            selected={mode === 'AIR'}
            disabled={Boolean(airReason)}
            onChange={() => chooseMode('AIR')}
            title="Air"
            description={airLine(air)}
            meta={optionMeta(fx('mode', 'AIR'), airReason)}
          />
        </div>
      </Group>

      {mode === 'ROAD' && (
        <Group
          title="Trailer"
          sub="An arrival window on step 2 books a private trailer."
          error={errorOf('trailer')}
        >
          <div className="grid grid-cols-2 gap-4">
            <OptionCard
              name="trailer"
              value="SHARED"
              selected={!window && values.trailer === 'SHARED'}
              disabled={window}
              onChange={() => set('trailer', 'SHARED')}
              title="Shared load"
              description="Shares a trailer with other consignments on set departures."
              meta={optionMeta(
                fx('trailer', 'SHARED'),
                window ? 'Your arrival window needs a private trailer.' : undefined,
              )}
            />
            <OptionCard
              name="trailer"
              value="PRIVATE"
              selected={window || values.trailer === 'PRIVATE'}
              onChange={() => set('trailer', 'PRIVATE')}
              title="Private trailer"
              description="Your own trailer and your own departure time."
              meta={optionMeta(fx('trailer', 'PRIVATE'))}
            />
          </div>
        </Group>
      )}

      {mode === 'AIR' && (
        <Group title="Air class" error={errorOf('airClass')}>
          <div className="grid grid-cols-3 gap-4">
            {CLASSES.map((c) => (
              <OptionCard
                key={c.value}
                name="airClass"
                value={c.value}
                selected={values.airClass === c.value}
                onChange={() => set('airClass', c.value)}
                title={c.title}
                meta={optionMeta(fx('airClass', c.value))}
              />
            ))}
          </div>
          <p className="type-body-s m-0 rounded-md bg-sunken px-4 py-3 text-ink-2">
            Whether each horse fits the class is checked when the move is priced.
          </p>
        </Group>
      )}

      {horses.length > 0 && (
        <Group title="Stalls" sub="Set by each horse’s profile, so there is nothing to choose.">
          <Panel flush>{horses.map(stallRow)}</Panel>
        </Group>
      )}

      <Group title="Extras">
        <Panel flush>
          <FactRow
            first
            lead={<Fixed />}
            title={`Grooms · ${groomsFor(Math.max(horses.length, 1))}`}
            sub="One groom per three horses, rounded up. Always included."
          />
          <div className="flex items-center gap-3.5 border-t border-line px-4.5 py-3.5">
            <Checkbox
              label={
                <span className="flex flex-col gap-0.5">
                  <span className="type-label-m text-ink">Veterinary escort</span>
                  <span className="type-body-s text-ink-3">A vet travels with the horses.</span>
                </span>
              }
              checked={values.vetEscort}
              onChange={(e) => set('vetEscort', e.target.checked)}
            />
          </div>
        </Panel>
      </Group>

      <Group
        title="Transit insurance"
        sub="The horses must be insured for the journey plus 2 days."
        error={errorOf('insurance')}
      >
        <div className="grid grid-cols-2 gap-4">
          <OptionCard
            name="insurance"
            value="EQUIFREIGHT"
            icon="shield"
            selected={values.insurance === 'EQUIFREIGHT'}
            onChange={() => set('insurance', 'EQUIFREIGHT')}
            title="Through EquiFreight"
            meta={optionMeta(fx('insurance', 'EQUIFREIGHT'))}
            description={`Insured for the declared value (${formatValue(declared)}), on the quotation as its own line.`}
          />
          <OptionCard
            name="insurance"
            value="OWN_POLICY"
            icon="file"
            selected={values.insurance === 'OWN_POLICY'}
            onChange={() => set('insurance', 'OWN_POLICY')}
            title="Your own policy"
            meta={optionMeta(fx('insurance', 'OWN_POLICY'))}
            description="You upload it with your documents; it’s checked against your travel dates plus 2 days. No charge from us."
          />
        </div>
      </Group>

      <StepRefusal messages={refusal ? [refusal] : []} />

      <div className="flex items-center justify-between gap-6 border-t border-line pt-5">
        <Button leadingIcon="arrow-left" disabled={saving} onClick={onBack}>
          Back
        </Button>
        <span className="type-label-s text-center text-ink-2">{serviceLine(values, horses)}</span>
        <Button
          variant="primary"
          trailingIcon="arrow-right"
          disabled={saving || held}
          onClick={onContinue}
        >
          Continue
        </Button>
      </div>
    </>
  );
};

export default ServiceStep;
