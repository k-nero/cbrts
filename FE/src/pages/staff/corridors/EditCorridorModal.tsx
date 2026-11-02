import { type FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { MODE_LABEL } from './routeOptions';
import { type EditCorridorForm, editCorridorSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Button } from '@/components/ui';
import { useUpdateCorridor } from '@/hooks/routeCatalog';
import { useBorderCrossings } from '@/hooks/useJob';
import { type Corridor, TransportModeEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

type Props = {
  /** The route being edited; the modal is closed when null. */
  corridor: Corridor | null;
  onClose: () => void;
  onAddCrossing: () => void;
};

/**
 * Edit route: its code, distance, flexible and driving days, and by road the border crossings it
 * takes in order from the origin. Its mode and two cities stay: they are what it is priced and quoted
 * by. The server refuses a code another route has, crossings that don't lead from the origin's
 * country to the destination's, and a re-route a vehicle on the route has no permit for.
 */
const EditCorridorModal: FC<Props> = ({ corridor, onClose, onAddCrossing }) => {
  const { message } = App.useApp();
  const open = corridor !== null;
  const byRoad = corridor?.mode === TransportModeEnum.ROAD;
  const update = useUpdateCorridor();
  const crossings = useBorderCrossings(open);
  const methods = useFormCustom<EditCorridorForm>({ resolver: zodResolver(editCorridorSchema) });

  const crossingOptions = useMemo(
    () =>
      (crossings.data ?? []).map((c) => ({
        label: `${c.name} (${c.fromCountry} – ${c.toCountry})`,
        value: c.id,
      })),
    [crossings.data],
  );

  // A route lists its crossings by name, which is unique in the catalog; the form picks them by id.
  useEffect(() => {
    if (!corridor || (byRoad && !crossings.data)) return;
    methods.reset({
      code: corridor.code,
      distanceKm: corridor.distanceKm,
      dateFlexDays: corridor.dateFlexDays,
      drivingDays: corridor.drivingDays,
      crossings: corridor.crossings.flatMap((name) => {
        const id = crossings.data?.find((c) => c.name === name)?.id;
        const match = crossingOptions.find((o) => o.value === id);
        return match ? [match] : [];
      }),
    });
  }, [byRoad, corridor, crossingOptions, crossings.data, methods]);

  const onSubmit = methods.handleSubmit(async (v) => {
    if (!corridor) return;
    try {
      const saved = await update.mutateAsync({
        id: corridor.id,
        body: {
          code: v.code,
          distanceKm: v.distanceKm,
          dateFlexDays: v.dateFlexDays,
          drivingDays: byRoad ? v.drivingDays : null,
          crossingIds: byRoad ? (v.crossings ?? []).map((c) => c.value) : [],
        },
      });
      void message.success(`${saved.code} saved.`);
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(err, 'The route wasn’t saved. Check the fields and try again.'),
      });
    }
  });

  return (
    <BaseModal
      open={open}
      onCancel={onClose}
      title={corridor ? `${corridor.code} · Edit route` : 'Edit route'}
      width={640}
    >
      {corridor && (
        <p className="type-body-s mb-4 text-ink-3">
          {MODE_LABEL[corridor.mode] ?? corridor.mode} · {corridor.originCity} →{' '}
          {corridor.destinationCity}. The mode and cities stay; add a new route to run another way.
        </p>
      )}
      <FormWrapper
        methods={methods}
        isSubmitting={update.isPending}
        mode="edit"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="code"
              label="Route code"
              component="text"
              componentProps={{ isRequired: true, placeholder: 'RD PNH → SRP', maxLength: 40 }}
            />
            {byRoad && (
              <>
                <FormField
                  name="crossings"
                  label="Border crossings"
                  component="select"
                  componentProps={{
                    isMulti: true,
                    options: crossingOptions,
                    isLoading: crossings.isPending,
                    instruction:
                      'In order from the origin; leave empty when the route stays in one country.',
                  }}
                />
                <Flex justify="start" className="-mt-2 mb-4">
                  <Button size="sm" variant="ghost" leadingIcon="plus" onClick={onAddCrossing}>
                    Add a border crossing
                  </Button>
                </Flex>
              </>
            )}
            <Flex gap={16}>
              <FormField
                name="distanceKm"
                label="Distance (km)"
                component="number"
                componentProps={{ min: 1, max: 20000, step: 10 }}
              />
              <FormField
                name="dateFlexDays"
                label="Flexible dates (± days)"
                component="number"
                componentProps={{
                  isRequired: true,
                  min: 0,
                  max: 7,
                  instruction: 'How far a request’s dates can move; 0 is fixed dates only.',
                }}
              />
              {byRoad && (
                <FormField
                  name="drivingDays"
                  label="Driving days"
                  component="number"
                  componentProps={{ isRequired: true, min: 1, max: 30 }}
                />
              )}
            </Flex>
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Save" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default EditCorridorModal;
