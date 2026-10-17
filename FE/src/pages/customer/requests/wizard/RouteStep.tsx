import type { FC, ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Group, StepRefusal } from './parts';

import type { StepProps } from '.';

import { useFormWrapperCtx } from '@/components/form/FormWrapper';
import { Button, Callout, Checkbox, OptionCard, Panel, RouteStrip } from '@/components/ui';
import { searchPlaces } from '@/apis/request';
import { useOriginRoutes } from '@/hooks/request';
import type { Route } from '@/interfaces';
import {
  formatDay,
  type PlaceOption,
  routeSentence,
  routeStops,
  windowLength,
  windowMinutes,
  type WizardValues,
} from '@/lib/utils';

/** Every half hour of the day, for the window's From and Until. */
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const t = `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  return { value: t, label: t };
});

const PENALTY =
  'The penalty is 10% of the job total for each started hour after the window closes, up to 30%, credited on the final invoice. The clock stops while a border authority holds the trailer or a vet stops it for a horse’s welfare. Your quotation states the exact terms.';

type PlaceChoice = PlaceOption & { country?: string };

/** Pickup and delivery points whose name or city matches what is typed. */
const loadPlaces = (q: string): Promise<PlaceChoice[]> =>
  searchPlaces(q).then((places) =>
    places.map((p) => ({
      value: p.id,
      label: `${p.name}, ${p.city}`,
      city: p.city,
      country: p.countryName,
    })),
  );

/** A city that matches no place is kept as typed: it can be saved, but never routed. */
const typedCity = async (text: string): Promise<PlaceChoice> => ({
  value: text,
  label: text,
  city: text,
  __isNew__: true,
});

const placeLabel = (o: PlaceChoice, { context }: { context: 'menu' | 'value' }): ReactNode =>
  context === 'menu' && o.country ? (
    <span className="flex flex-col">
      <span>{o.label}</span>
      <span className="type-body-s text-ink-3">{o.country}</span>
    </span>
  ) : (
    o.label
  );

/** "Bangkok → Kuala Lumpur by road · ~1,450 km · 1 border crossing". */
const alternativeLine = (r: Route) => {
  const crossings = r.crossings.length;
  const borders =
    crossings === 0
      ? 'no border crossing'
      : `${crossings} border crossing${crossings === 1 ? '' : 's'}`;
  const km = r.distanceKm === null ? '' : ` · ~${r.distanceKm.toLocaleString('en-US')} km`;
  return `${r.fromCity} → ${r.toCity} by ${r.mode === 'AIR' ? 'air' : 'road'}${km} · ${borders}`;
};

/** Step 2 (spec §5.3): from and to, the route we run (or that we don't), dates and arrival. */
const RouteStep: FC<StepProps> = ({
  saved,
  live,
  routes,
  route,
  notRun,
  saving,
  held,
  refusal,
  onContinue,
  onBack,
}) => {
  const { FormField } = useFormWrapperCtx<WizardValues>();
  const { control, setValue } = useFormContext<WizardValues>();
  const [origin, destination, arrivalMode, flexible, windowFrom, windowUntil] = useWatch({
    control,
    name: ['origin', 'destination', 'arrivalMode', 'flexible', 'windowFrom', 'windowUntil'],
  });
  const originId = origin && !origin.__isNew__ ? origin.value : null;
  const alternatives = useOriginRoutes(originId, notRun);
  const set = <K extends keyof WizardValues>(name: K, value: WizardValues[K]) =>
    setValue(name, value as never, { shouldDirty: true });

  const fromCity = origin?.city ?? null;
  const toCity = destination?.city ?? null;
  const roadRuns = routes.length === 0 || routes.some((r) => r.mode === 'ROAD');
  const tooSoon = live.some((b) => b.code === 'LEAD_TIME_TOO_SHORT');
  const earliest = saved?.leadTime?.earliestDeparture ?? null;

  const takeRoute = async (r: Route) => {
    const places = await loadPlaces(r.toCity);
    const match = places.find((p) => p.city?.toLowerCase() === r.toCity.toLowerCase());
    if (match) set('destination', match);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="type-h3 m-0 text-ink">Route and dates</h2>
        <p className="type-body-m m-0 text-ink-2">
          We work out the border crossings from the route. Cross-border moves need time for
          documents to clear.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="origin"
          label="From"
          component="async-creatable-select"
          componentProps={{
            loadOptions: loadPlaces,
            asyncCreateOption: typedCity,
            formatCreateLabel: (text: string) => `Use “${text}”`,
            formatOptionLabel: placeLabel,
            cacheOptions: true,
            placeholder: 'A place or a city',
          }}
        />
        <FormField
          name="destination"
          label="To"
          component="async-creatable-select"
          componentProps={{
            loadOptions: loadPlaces,
            asyncCreateOption: typedCity,
            formatCreateLabel: (text: string) => `Use “${text}”`,
            formatOptionLabel: placeLabel,
            cacheOptions: true,
            placeholder: 'A place or a city',
            instruction: notRun ? 'Outside the region we run.' : undefined,
          }}
        />
      </div>

      {notRun ? (
        <>
          <Callout
            tone="warn"
            title={`We don’t run ${fromCity ?? 'this'} → ${toCity ?? 'route'} yet`}
          >
            We move horses by road within Vietnam, Cambodia, Thailand, Laos and Malaysia, and by air
            through Hong Kong. There is no estimate or quotation for this route.
          </Callout>
          {originId && (alternatives.data?.length ?? 0) > 0 && (
            <Panel title={`Routes we run from ${fromCity}`}>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {alternatives.data?.map((r) => (
                  <li key={r.corridorId} className="flex items-center justify-between gap-4">
                    <span className="type-body-s text-ink-2">{alternativeLine(r)}</span>
                    <Button size="sm" trailingIcon="arrow-right" onClick={() => void takeRoute(r)}>
                      Use this route
                    </Button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      ) : (
        <>
          {route && (
            <div className="flex flex-col gap-2.5">
              <div className="overflow-x-auto rounded-lg border border-line bg-card p-5">
                <RouteStrip stops={routeStops(route)} />
              </div>
              <p className="type-body-s m-0 text-ink-3">
                {routeSentence(route)} The fleet coordinator plans the exact road and stops after
                approval.
                {routes.length > 1 && ' Also by air: choose on step 3.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="departureDate"
              label="Departure date"
              component="datepicker"
              componentProps={{
                format: 'D MMM YYYY',
                instruction:
                  route?.earliestDeparture && route.leadTimeDays !== null
                    ? `Earliest departure ${formatDay(route.earliestDeparture)} · ${route.leadTimeDays} days’ notice`
                    : undefined,
              }}
            />
            <FormField
              name="specialInstructions"
              label="Special instructions"
              component="textarea"
              componentProps={{ maxLength: 500, autoSize: { minRows: 1, maxRows: 4 } }}
            />
          </div>

          <Group
            title="Arrival"
            sub="Road moves only. By air, the airline’s schedule sets the arrival time."
          >
            <div className="grid grid-cols-2 gap-4">
              <OptionCard
                name="arrivalMode"
                value="ANY_TIME"
                icon="clock"
                selected={arrivalMode === 'ANY_TIME'}
                onChange={() => set('arrivalMode', 'ANY_TIME')}
                title="Any time on the day"
                description="We plan the fastest safe route and tell you the expected time. Your dates can move by ±3 days."
              />
              <OptionCard
                name="arrivalMode"
                value="WINDOW"
                icon="calendar"
                selected={arrivalMode === 'WINDOW'}
                disabled={!roadRuns}
                onChange={() => set('arrivalMode', 'WINDOW')}
                title="Within a window"
                description="You choose a window of at least 3 hours. We use a private trailer so the departure is yours."
                meta={roadRuns ? undefined : 'Road moves only'}
              />
            </div>
            {arrivalMode === 'WINDOW' ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    name="arriveOn"
                    label="Arrive on"
                    component="datepicker"
                    componentProps={{ format: 'D MMM YYYY' }}
                  />
                  <FormField
                    name="windowFrom"
                    label="From"
                    component="select"
                    componentProps={{ options: TIMES }}
                  />
                  <FormField
                    name="windowUntil"
                    label="Until"
                    component="select"
                    componentProps={{
                      options: TIMES,
                      instruction:
                        windowFrom &&
                        windowUntil &&
                        windowMinutes(windowFrom.value, windowUntil.value) > 0
                          ? windowLength(windowFrom.value, windowUntil.value)
                          : undefined,
                    }}
                  />
                </div>
                <Callout
                  tone="info"
                  title={`If we arrive after ${windowUntil?.value ?? 'the window closes'}, we pay`}
                >
                  {PENALTY}
                </Callout>
              </>
            ) : (
              <Checkbox
                label="My dates can move by ±3 days"
                checked={flexible}
                onChange={(e) => set('flexible', e.target.checked)}
              />
            )}
          </Group>
        </>
      )}

      <StepRefusal messages={refusal ? [refusal] : []} />

      <div className="flex items-center justify-between border-t border-line pt-5">
        <Button leadingIcon="arrow-left" disabled={saving} onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-4">
          {notRun && (
            <span className="type-body-s text-ink-3">Choose a route we run to continue</span>
          )}
          {tooSoon && earliest && (
            <Button leadingIcon="calendar" onClick={() => set('departureDate', earliest)}>
              Use {formatDay(earliest)}
            </Button>
          )}
          <Button
            variant="primary"
            trailingIcon="arrow-right"
            disabled={saving || held || notRun}
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </>
  );
};

export default RouteStep;
