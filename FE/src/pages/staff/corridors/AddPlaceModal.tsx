import { type FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { PLACE_KIND_OPTIONS } from './routeOptions';
import { type PlaceForm, placeSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useCountries, useCreatePlace } from '@/hooks/routeCatalog';
import type { PlaceKind } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

type Props = { open: boolean; onClose: () => void };

/**
 * Add place: a pickup, delivery or stop point. A route can only run between cities that have one,
 * because a request finds its route from the city of its places.
 */
const AddPlaceModal: FC<Props> = ({ open, onClose }) => {
  const { message } = App.useApp();
  const countries = useCountries();
  const create = useCreatePlace();
  const methods = useFormCustom<PlaceForm>({ resolver: zodResolver(placeSchema) });
  const countryOptions = useMemo(
    () => (countries.data ?? []).map((c) => ({ label: c.name, value: c.id })),
    [countries.data],
  );

  useEffect(() => {
    if (!open) return;
    methods.reset({ name: '', kind: PLACE_KIND_OPTIONS[0], city: '', country: null, address: '' });
  }, [methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      const created = await create.mutateAsync({
        name: v.name,
        kind: v.kind?.value as PlaceKind,
        city: v.city,
        countryId: v.country?.value ?? '',
        address: v.address.trim() || null,
      });
      void message.success(`${created.name} added in ${created.city}.`);
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(err, 'The place wasn’t added. Check the fields and try again.'),
      });
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title="Add place">
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
            <FormField
              name="name"
              label="Name"
              component="text"
              componentProps={{
                isRequired: true,
                placeholder: 'Angkor Equestrian Centre',
                maxLength: 160,
              }}
            />
            <FormField
              name="kind"
              label="Kind"
              component="select"
              componentProps={{
                isRequired: true,
                options: PLACE_KIND_OPTIONS,
                instruction: 'A welfare stop is a stop on the way; it never ends a route.',
              }}
            />
            <Flex gap={16}>
              <FormField
                name="city"
                label="City"
                component="text"
                componentProps={{ isRequired: true, placeholder: 'Siem Reap', maxLength: 80 }}
              />
              <FormField
                name="country"
                label="Country"
                component="select"
                componentProps={{
                  isRequired: true,
                  options: countryOptions,
                  isLoading: countries.isPending,
                  instruction: 'A new country is added with its regulation catalog.',
                }}
              />
            </Flex>
            <FormField
              name="address"
              label="Address"
              component="text"
              componentProps={{ maxLength: 300 }}
            />
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Add place" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default AddPlaceModal;
