import { type FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type CrossingForm, crossingSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useCountries, useCreateBorderCrossing } from '@/hooks/routeCatalog';
import { apiErrorMessage } from '@/lib';

type Props = { open: boolean; onClose: () => void };

/** Add border crossing: the land border a road route takes between two countries we serve. */
const AddCrossingModal: FC<Props> = ({ open, onClose }) => {
  const { message } = App.useApp();
  const countries = useCountries();
  const create = useCreateBorderCrossing();
  const methods = useFormCustom<CrossingForm>({ resolver: zodResolver(crossingSchema) });
  const countryOptions = useMemo(
    () => (countries.data ?? []).map((c) => ({ label: c.name, value: c.id })),
    [countries.data],
  );

  useEffect(() => {
    if (!open) return;
    methods.reset({ name: '', fromCountry: null, toCountry: null, roadOnly: true });
  }, [methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      const created = await create.mutateAsync({
        name: v.name,
        fromCountryId: v.fromCountry?.value ?? '',
        toCountryId: v.toCountry?.value ?? '',
        roadOnly: v.roadOnly,
      });
      void message.success(`${created.name} added.`);
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(
          err,
          'The border crossing wasn’t added. Check the fields and try again.',
        ),
      });
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title="Add border crossing">
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
              componentProps={{ isRequired: true, placeholder: 'Mộc Bài – Bavet', maxLength: 120 }}
            />
            <Flex gap={16}>
              <FormField
                name="fromCountry"
                label="From"
                component="select"
                componentProps={{
                  isRequired: true,
                  options: countryOptions,
                  isLoading: countries.isPending,
                }}
              />
              <FormField
                name="toCountry"
                label="To"
                component="select"
                componentProps={{
                  isRequired: true,
                  options: countryOptions,
                  isLoading: countries.isPending,
                  instruction: 'A route can take it in either direction.',
                }}
              />
            </Flex>
            <FormField
              name="roadOnly"
              component="checkbox"
              componentProps={{ children: 'Road only (no rail or ferry link)' }}
            />
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Add border crossing" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default AddCrossingModal;
