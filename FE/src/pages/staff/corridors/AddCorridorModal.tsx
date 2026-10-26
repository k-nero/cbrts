import { type FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';
import { useWatch } from 'react-hook-form';

import { MODE_OPTIONS } from './routeOptions';
import { type CorridorForm, corridorSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Button } from '@/components/ui';
import { useBorderCrossings } from '@/hooks/useJob';
import { useCatalogPlaces, type useCorridorList } from '@/hooks/routeCatalog';
import { PlaceKindEnum, TransportModeEnum, type TransportMode } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

type Props = {
  open: boolean;
  create: ReturnType<typeof useCorridorList>['createCorridor'];
  onClose: () => void;
  onAddPlace: () => void;
  onAddCrossing: () => void;
};

/**
 * New route: its code, mode and two cities, and by road the border crossings it takes in order from
 * the origin. A city is offered once it has a place; the transport specialist then prices the route
 * in the draft rate version.
 */
const AddCorridorModal: FC<Props> = ({ open, create, onClose, onAddPlace, onAddCrossing }) => {
  const { message } = App.useApp();
  const places = useCatalogPlaces();
  const crossings = useBorderCrossings(open);
  const methods = useFormCustom<CorridorForm>({ resolver: zodResolver(corridorSchema) });
  const mode = useWatch({ control: methods.control, name: 'mode' });
  const byRoad = mode?.value === TransportModeEnum.ROAD;

  // One option per city that has a place a request can start or end at.
  const cityOptions = useMemo(() => {
    const seen = new Map<string, { label: string; value: string }>();
    for (const p of places.data ?? []) {
      if (!p.city || p.kind === PlaceKindEnum.WELFARE_STOP) continue;
      const key = p.city.toLowerCase();
      if (!seen.has(key)) seen.set(key, { label: `${p.city}, ${p.countryName}`, value: p.city });
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [places.data]);
  const crossingOptions = useMemo(
    () =>
      (crossings.data ?? []).map((c) => ({
        label: `${c.name} (${c.fromCountry} – ${c.toCountry})`,
        value: c.id,
      })),
    [crossings.data],
  );

  useEffect(() => {
    if (!open) return;
    methods.reset({
      code: '',
      mode: MODE_OPTIONS[0],
      originCity: null,
      destinationCity: null,
      crossings: [],
      distanceKm: null,
      dateFlexDays: 3,
    });
  }, [methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      const created = await create.mutateAsync({
        code: v.code,
        mode: v.mode?.value as TransportMode,
        originCity: v.originCity?.value ?? '',
        destinationCity: v.destinationCity?.value ?? '',
        distanceKm: v.distanceKm,
        dateFlexDays: v.dateFlexDays,
        crossingIds: byRoad ? (v.crossings ?? []).map((c) => c.value) : [],
      });
      void message.success(`${created.code} added. Price it in the draft rate version next.`);
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(err, 'The route wasn’t added. Check the fields and try again.'),
      });
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title="New route" width={640}>
      <FormWrapper
        methods={methods}
        isSubmitting={create.isPending}
        mode="add"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <Flex gap={16}>
              <FormField
                name="code"
                label="Route code"
                component="text"
                componentProps={{ isRequired: true, placeholder: 'RD PNH → SRP', maxLength: 40 }}
              />
              <FormField
                name="mode"
                label="Mode"
                component="select"
                componentProps={{ isRequired: true, options: MODE_OPTIONS }}
              />
            </Flex>
            <Flex gap={16}>
              <FormField
                name="originCity"
                label="From"
                component="select"
                componentProps={{
                  isRequired: true,
                  options: cityOptions,
                  isLoading: places.isPending,
                }}
              />
              <FormField
                name="destinationCity"
                label="To"
                component="select"
                componentProps={{
                  isRequired: true,
                  options: cityOptions,
                  isLoading: places.isPending,
                }}
              />
            </Flex>
            <Flex align="center" gap={8} className="-mt-2 mb-4">
              <span className="type-body-s text-ink-3">
                A city is listed once it has a pickup or delivery place.
              </span>
              <Button size="sm" variant="ghost" leadingIcon="plus" onClick={onAddPlace}>
                Add a place
              </Button>
            </Flex>
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
            </Flex>
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Add route" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default AddCorridorModal;
