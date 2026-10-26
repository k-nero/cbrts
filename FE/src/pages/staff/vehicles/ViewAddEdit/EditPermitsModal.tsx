import { type FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { cityOptions, corridorOptions, countryOptions } from '../vehicleOptions';
import { type PermitsForm, permitsSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useCatalogPlaces, useCountries } from '@/hooks/routeCatalog';
import { useCorridors } from '@/hooks/useJob';
import { useUpdateVehicle } from '@/hooks/useVehicle';
import type { Vehicle } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

type Props = {
  /** The vehicle being edited; the modal is closed when null. */
  vehicle: Vehicle | null;
  onClose: () => void;
};

/**
 * Countries and corridors (US-F7-01): where a vehicle is based, the countries it holds permits for
 * and the road corridors it works. The server refuses taking away a permit one of its corridors
 * needs, or a corridor or home country a trip it is still on depends on, naming what needs it.
 */
const EditPermitsModal: FC<Props> = ({ vehicle, onClose }) => {
  const { message } = App.useApp();
  const open = vehicle !== null;
  const update = useUpdateVehicle();
  const countries = useCountries();
  const places = useCatalogPlaces();
  const cityChoices = useMemo(() => cityOptions(places.data), [places.data]);
  const corridors = useCorridors(open);
  const countryChoices = useMemo(() => countryOptions(countries.data), [countries.data]);
  const corridorChoices = useMemo(() => corridorOptions(corridors.data), [corridors.data]);
  const methods = useFormCustom<PermitsForm>({ resolver: zodResolver(permitsSchema) });

  useEffect(() => {
    if (!vehicle) return;
    const asOption = (c: { id: string; code: string; name?: string }) => ({
      label: c.name ? `${c.name} (${c.code})` : c.code,
      value: c.id,
    });
    methods.reset({
      homeCity: vehicle.homeCity ? { label: vehicle.homeCity, value: vehicle.homeCity } : null,
      permittedCountries: (vehicle.permittedCountries ?? []).map(asOption),
      operatingCorridors: (vehicle.operatingCorridors ?? []).map(asOption),
    });
  }, [methods, vehicle]);

  const onSubmit = methods.handleSubmit(async (v) => {
    if (!vehicle) return;
    try {
      const saved = await update.mutateAsync({
        id: vehicle.id,
        body: {
          homeCity: v.homeCity?.value,
          permittedCountryIds: (v.permittedCountries ?? []).map((c) => c.value),
          operatingCorridorIds: (v.operatingCorridors ?? []).map((c) => c.value),
        },
      });
      void message.success(`${saved.code}’s countries and corridors saved.`);
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(err, 'The changes weren’t saved. Check the fields and try again.'),
      });
    }
  });

  return (
    <BaseModal
      open={open}
      onCancel={onClose}
      title={vehicle ? `${vehicle.code} · Countries and corridors` : 'Countries and corridors'}
    >
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
              name="homeCity"
              label="Based in"
              component="select"
              componentProps={{
                isRequired: true,
                options: cityChoices,
                isLoading: places.isPending,
                instruction: 'Where it is when it has run no trip yet; its home country follows.',
              }}
            />
            <FormField
              name="permittedCountries"
              label="Permits for"
              component="select"
              componentProps={{
                isMulti: true,
                options: countryChoices,
                isLoading: countries.isPending,
                placeholder: 'No other country',
                instruction: 'The foreign countries it may drive in.',
              }}
            />
            <FormField
              name="operatingCorridors"
              label="Corridors it works"
              component="select"
              componentProps={{
                isRequired: true,
                isMulti: true,
                options: corridorChoices,
                isLoading: corridors.isPending,
                instruction: 'It needs a permit for every country a corridor passes through.',
              }}
            />
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

export default EditPermitsModal;
