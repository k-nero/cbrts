import { type FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type CrossingForm, crossingSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import {
  useCountries,
  useCreateBorderCrossing,
  useUpdateBorderCrossing,
} from '@/hooks/routeCatalog';
import type { BorderCrossing } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

type Props = {
  open: boolean;
  onClose: () => void;
  /** The crossing to edit; adds a new one when left out. */
  crossing?: BorderCrossing | null;
};

/**
 * Add or edit a border crossing: the land border a road route takes between two countries we serve.
 * The server keeps the countries of a crossing a route, a route plan or a checklist uses.
 */
const AddCrossingModal: FC<Props> = ({ open, onClose, crossing = null }) => {
  const { message } = App.useApp();
  const countries = useCountries();
  const create = useCreateBorderCrossing();
  const update = useUpdateBorderCrossing();
  const editing = crossing !== null;
  const methods = useFormCustom<CrossingForm>({ resolver: zodResolver(crossingSchema) });
  const countryOptions = useMemo(
    () => (countries.data ?? []).map((c) => ({ label: c.name, value: c.id })),
    [countries.data],
  );

  // A crossing names its countries; the form picks them by id.
  useEffect(() => {
    if (!open) return;
    if (!crossing) {
      methods.reset({ name: '', fromCountry: null, toCountry: null, roadOnly: true });
      return;
    }
    const byName = (name: string) => countryOptions.find((o) => o.label === name) ?? null;
    methods.reset({
      name: crossing.name,
      fromCountry: byName(crossing.fromCountry),
      toCountry: byName(crossing.toCountry),
      roadOnly: crossing.roadOnly,
    });
  }, [countryOptions, crossing, methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      const body = {
        name: v.name,
        fromCountryId: v.fromCountry?.value ?? '',
        toCountryId: v.toCountry?.value ?? '',
        roadOnly: v.roadOnly,
      };
      const saved = crossing
        ? await update.mutateAsync({ id: crossing.id, body })
        : await create.mutateAsync(body);
      void message.success(`${saved.name} ${crossing ? 'saved' : 'added'}.`);
      onClose();
    } catch (err) {
      methods.setError('form_error', {
        message: apiErrorMessage(
          err,
          `The border crossing wasn’t ${editing ? 'saved' : 'added'}. Check the fields and try again.`,
        ),
      });
    }
  });

  return (
    <BaseModal
      open={open}
      onCancel={onClose}
      title={crossing ? `${crossing.name} · Edit border crossing` : 'Add border crossing'}
    >
      <FormWrapper
        methods={methods}
        isSubmitting={create.isPending || update.isPending}
        mode={editing ? 'edit' : 'add'}
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
              <SubmitButton type="primary" label={editing ? 'Save' : 'Add border crossing'} />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default AddCrossingModal;
