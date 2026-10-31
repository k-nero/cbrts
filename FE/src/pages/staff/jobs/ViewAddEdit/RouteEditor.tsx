import { type FC, Fragment, useMemo, useState } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import {
  emptyLeg,
  emptyStop,
  LOCAL_DATETIME,
  MODES,
  recalculatedTimes,
  type RouteDraftForm,
  routeDraftSchema,
  STOP_KINDS,
  toForm,
  toInput,
} from './routeDraft';
import { StopPlaceField } from './StopPlaceField';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button, Callout, IconButton, Panel } from '@/components/ui';
import { useBorderCrossings, useSaveRouteDraft } from '@/hooks/useJob';
import type { JobDetail, RoutePlan } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

const SHOWN_DATETIME = 'D MMM YYYY, HH:mm';

/**
 * The Route tab's editor (US-F3-17): the trip's stops in order with the leg between each pair, saved as the trip's
 * draft. It starts from the draft, else the confirmed route, else the job's pickup and delivery places. The server
 * checks the route again when it is confirmed.
 */
export const RouteEditor: FC<{
  job: JobDetail;
  /** The trip's draft, else its confirmed route; null when it has none. */
  from: RoutePlan | null;
  /** Whether a confirmed route will be superseded, so a reason is asked for. */
  supersedes: boolean;
  onClose: () => void;
}> = ({ job, from, supersedes, onClose }) => {
  const { message } = App.useApp();
  const save = useSaveRouteDraft(job.id);
  const crossings = useBorderCrossings(true);
  const initial = useMemo(() => toForm(from, job), [from, job]);
  const methods = useFormCustom<RouteDraftForm>({
    resolver: zodResolver(routeDraftSchema),
    defaultValues: initial,
  });
  const stops = useFieldArray({ control: methods.control, name: 'stops' });
  const legs = useFieldArray({ control: methods.control, name: 'legs' });
  const modes = (useWatch({ control: methods.control, name: 'legs' }) ?? []).map(
    (l) => l.mode?.value,
  );
  // What the last move or recalculation changed, said once under the stops.
  const [notice, setNotice] = useState<{ tone: 'warn' | 'ok'; title: string; body: string } | null>(
    null,
  );
  const crossingOptions = (crossings.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.name} (${c.fromCountry} – ${c.toCountry})`,
  }));

  // A leg joins stop i to stop i + 1: inserting a stop splits a leg, removing one joins its neighbours.
  const insertStop = (at: number) => {
    stops.insert(at, emptyStop('WELFARE'));
    legs.insert(Math.min(at, legs.fields.length), emptyLeg());
  };
  const removeStop = (at: number) => {
    stops.remove(at);
    legs.remove(at < stops.fields.length - 1 ? at : at - 1);
  };
  // Swapping stops i and i + 1: the leg between them still joins the same two places, but the legs either side now
  // join different ones, so their distance and time are cleared to be planned again (the mode stays).
  const swapStops = (i: number) => {
    stops.swap(i, i + 1);
    const cleared = [i - 1, i + 1].filter((l) => l >= 0 && l < legs.fields.length);
    cleared.forEach((l) =>
      legs.update(l, { ...emptyLeg(), mode: methods.getValues(`legs.${l}.mode`) }),
    );
    setNotice({
      tone: 'warn',
      title: `Stops ${i + 1} and ${i + 2} swapped`,
      body:
        cleared.length > 0
          ? `${cleared.map((l) => `Leg ${l + 1}`).join(' and ')} now ${cleared.length === 1 ? 'joins' : 'join'} different places, so ${cleared.length === 1 ? 'its' : 'their'} distance and time were cleared. Enter them, then recalculate the times from the departure.`
          : 'Check the planned times, or recalculate them from the departure.',
    });
  };
  // Departure plus each stay and leg time, for every stop after the first.
  const recalculate = () => {
    const result = recalculatedTimes(methods.getValues());
    if (!result) {
      setNotice({
        tone: 'warn',
        title: 'No departure time',
        body: 'Set the first stop’s planned time; the others are worked out from it.',
      });
      return;
    }
    result.times.forEach((t, i) => {
      if (i > 0) methods.setValue(`stops.${i}.plannedAt`, t, { shouldValidate: true });
    });
    setNotice(
      result.missingLeg == null
        ? {
            tone: 'ok',
            title: 'Times recalculated',
            body: 'Each stop is the one before plus its stay and the leg’s time.',
          }
        : {
            tone: 'warn',
            title: `Times recalculated up to stop ${result.missingLeg}`,
            body: `Leg ${result.missingLeg} has no time, so the stops after it keep theirs. Enter its time and recalculate again.`,
          },
    );
  };

  const onSubmit = methods.handleSubmit((v) =>
    save.mutate(toInput(v, job), {
      onSuccess: (plan) => {
        message.success(`Route draft v${plan.versionNo} saved. Confirm it when it's ready.`);
        onClose();
      },
    }),
  );

  return (
    <Panel title={from ? `Edit route · from v${from.versionNo}` : 'Plan the route'} className="p-4">
      <FormWrapper
        methods={methods}
        isSubmitting={save.isPending}
        mode="edit"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <Flex vertical gap={12}>
            {stops.fields.map((field, i) => (
              <Fragment key={field.id}>
                <div className="rounded-lg border border-line bg-card p-4">
                  <Flex gap={12} align="start" wrap>
                    <span className="type-mono-label pt-8 text-ink-3">{i + 1}</span>
                    <div className="w-48">
                      <FormField
                        name={`stops.${i}.kind`}
                        label="Stop"
                        component="select"
                        componentProps={{ isRequired: true, options: STOP_KINDS }}
                      />
                    </div>
                    <div className="min-w-64 flex-1">
                      <StopPlaceField
                        FormField={FormField}
                        index={i}
                        crossingOptions={crossingOptions}
                        crossingsLoading={crossings.isLoading}
                      />
                    </div>
                    <div className="w-56">
                      <FormField
                        name={`stops.${i}.plannedAt`}
                        label="Planned at"
                        component="datepicker"
                        componentProps={{
                          showTime: { format: 'HH:mm' },
                          format: SHOWN_DATETIME,
                          valueFormat: LOCAL_DATETIME,
                        }}
                      />
                    </div>
                    <div className="w-32">
                      <FormField
                        name={`stops.${i}.stayMin`}
                        label="Stay, min"
                        component="number"
                        componentProps={{ min: 0, step: 15 }}
                      />
                    </div>
                    <Flex gap={4} className="pt-7">
                      <IconButton
                        icon="arrow-up"
                        label={`Move stop ${i + 1} up`}
                        disabled={i === 0}
                        onClick={() => swapStops(i - 1)}
                      />
                      <IconButton
                        icon="chevron-down"
                        label={`Move stop ${i + 1} down`}
                        disabled={i === stops.fields.length - 1}
                        onClick={() => swapStops(i)}
                      />
                      <IconButton
                        icon="x"
                        label={`Remove stop ${i + 1}`}
                        disabled={stops.fields.length <= 2}
                        onClick={() => removeStop(i)}
                      />
                    </Flex>
                  </Flex>
                  <FormField
                    name={`stops.${i}.details`}
                    label="Details"
                    component="text"
                    componentProps={{ maxLength: 500, placeholder: 'Optional' }}
                  />
                </div>

                {i < stops.fields.length - 1 && (
                  <div className="ml-8 border-l-2 border-line-strong pl-6">
                    <Flex gap={12} align="start" wrap>
                      <div className="w-32">
                        <FormField
                          name={`legs.${i}.mode`}
                          label="Leg"
                          component="select"
                          componentProps={{ isRequired: true, options: MODES }}
                        />
                      </div>
                      <div className="w-32">
                        <FormField
                          name={`legs.${i}.distanceKm`}
                          label="Distance, km"
                          component="number"
                          componentProps={{ min: 0 }}
                        />
                      </div>
                      <div className="w-32">
                        <FormField
                          name={`legs.${i}.plannedMin`}
                          label="Time, min"
                          component="number"
                          componentProps={{ min: 0, step: 15 }}
                        />
                      </div>
                      <div className="pt-7">
                        <Button
                          size="sm"
                          variant="ghost"
                          leadingIcon="plus"
                          onClick={() => insertStop(i + 1)}
                        >
                          Add a stop here
                        </Button>
                      </div>
                    </Flex>
                    {modes[i] === 'AIR' && (
                      <Flex gap={12} align="start" wrap>
                        <div className="w-48">
                          <FormField
                            name={`legs.${i}.airline`}
                            label="Airline"
                            component="text"
                            componentProps={{ isRequired: true, maxLength: 80 }}
                          />
                        </div>
                        <div className="w-32">
                          <FormField
                            name={`legs.${i}.flightNo`}
                            label="Flight"
                            component="text"
                            componentProps={{
                              isRequired: true,
                              maxLength: 12,
                              placeholder: 'CX 2071',
                            }}
                          />
                        </div>
                        <div className="w-36">
                          <FormField
                            name={`legs.${i}.stallCapacity`}
                            label="Stall positions"
                            component="number"
                            componentProps={{ min: 1 }}
                          />
                        </div>
                        <div className="w-56">
                          <FormField
                            name={`legs.${i}.departsAt`}
                            label="Departs"
                            component="datepicker"
                            componentProps={{
                              showTime: { format: 'HH:mm' },
                              format: SHOWN_DATETIME,
                              valueFormat: LOCAL_DATETIME,
                            }}
                          />
                        </div>
                        <div className="w-56">
                          <FormField
                            name={`legs.${i}.arrivesAt`}
                            label="Arrives"
                            component="datepicker"
                            componentProps={{
                              showTime: { format: 'HH:mm' },
                              format: SHOWN_DATETIME,
                              valueFormat: LOCAL_DATETIME,
                            }}
                          />
                        </div>
                      </Flex>
                    )}
                  </div>
                )}
              </Fragment>
            ))}

            {notice && (
              <Callout tone={notice.tone} title={notice.title}>
                {notice.body}
              </Callout>
            )}
            <div>
              <Button size="sm" variant="secondary" leadingIcon="clock" onClick={recalculate}>
                Recalculate times from departure
              </Button>
            </div>

            {supersedes && (
              <FormField
                name="changeReason"
                label="Why the route changes"
                component="text"
                componentProps={{
                  maxLength: 500,
                  placeholder: 'Kept in the version history, e.g. "Flight moved to 19:00"',
                }}
              />
            )}
            {save.isError && (
              <Callout tone="bad" title="Not saved">
                {apiErrorMessage(save.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton label="Save draft" />
            </Flex>
          </Flex>
        )}
      </FormWrapper>
    </Panel>
  );
};
