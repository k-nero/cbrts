import { type FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import {
  cityOptions,
  corridorOptions,
  countryOptions,
  defaultStalls,
  KIND_OPTIONS,
  STALL_COUNT_OPTIONS,
} from '../vehicleOptions';
import { type VehicleForm, vehicleSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import type { UseCrudResourceResult } from '@/hooks/crud';
import { useCatalogPlaces, useCountries } from '@/hooks/routeCatalog';
import { useCorridors } from '@/hooks/useJob';
import type { CreateVehicleInput, Vehicle, VehicleKind } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

type Props = {
  open: boolean;
  crud: UseCrudResourceResult<Vehicle, CreateVehicleInput>;
  onClose: () => void;
};

/**
 * Add vehicle (US-F3-02, US-F7-01): the vehicle, its starting stall layout, where it is based, the
 * countries it holds permits for and the road corridors it works.
 */
const AddVehicleModal: FC<Props> = ({ open, crud, onClose }) => {
  const { message } = App.useApp();
  const methods = useFormCustom<VehicleForm>({ resolver: zodResolver(vehicleSchema) });
  const countries = useCountries();
  const places = useCatalogPlaces();
  const cityChoices = useMemo(() => cityOptions(places.data), [places.data]);
  const corridors = useCorridors(open);
  const countryChoices = useMemo(() => countryOptions(countries.data), [countries.data]);
  const corridorChoices = useMemo(() => corridorOptions(corridors.data), [corridors.data]);

  useEffect(() => {
    if (!open) return;
    methods.reset({
      code: '',
      kind: KIND_OPTIONS[0],
      payloadKg: 3200,
      stallCount: STALL_COUNT_OPTIONS[1],
      homeCity: null,
      permittedCountries: [],
      operatingCorridors: [],
    });
  }, [methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      const created = await crud.createMutation.mutateAsync({
        code: v.code,
        kind: v.kind?.value as VehicleKind,
        payloadKg: v.payloadKg,
        stalls: defaultStalls(Number(v.stallCount?.value)),
        homeCity: v.homeCity?.value ?? '',
        permittedCountryIds: (v.permittedCountries ?? []).map((c) => c.value),
        operatingCorridorIds: (v.operatingCorridors ?? []).map((c) => c.value),
      });
      void message.success(`${created.code} added to the fleet.`);
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(err, 'The vehicle wasn’t added. Check the fields and try again.'),
      });
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title="Add vehicle">
      <FormWrapper
        methods={methods}
        isSubmitting={crud.createMutation.isPending}
        mode="add"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="code"
              label="Vehicle code"
              component="text"
              componentProps={{ isRequired: true, placeholder: 'TX-550', maxLength: 20 }}
            />
            <Flex gap={16}>
              <FormField
                name="kind"
                label="Kind"
                component="select"
                componentProps={{ isRequired: true, options: KIND_OPTIONS }}
              />
              <FormField
                name="stallCount"
                label="Stalls"
                component="select"
                componentProps={{
                  isRequired: true,
                  options: STALL_COUNT_OPTIONS,
                  instruction: 'Two abreast; stall 2 is a box, stall 4 climate-controlled.',
                }}
              />
            </Flex>
            <FormField
              name="payloadKg"
              label="Payload (kg)"
              component="number"
              componentProps={{ isRequired: true, min: 500, max: 40000, step: 100 }}
            />
            <FormField
              name="homeCity"
              label="Based in"
              component="select"
              componentProps={{
                isRequired: true,
                options: cityChoices,
                isLoading: places.isPending,
                placeholder: 'Pick a city',
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
              <SubmitButton type="primary" label="Add vehicle" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default AddVehicleModal;
