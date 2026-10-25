import { type FC, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type CountryForm, countrySchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useAddCountry } from '@/hooks/regulation';
import type { RegulationCountry } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called with the new country, so the page can open it. */
  onAdded: (country: RegulationCountry) => void;
};

/** Add a country we serve, by its ISO code and name; its regulation catalog is created next (US-F2-12). */
export const AddCountryModal: FC<Props> = ({ open, onClose, onAdded }) => {
  const { message } = App.useApp();
  const add = useAddCountry();
  const methods = useFormCustom<CountryForm>({ resolver: zodResolver(countrySchema) });

  useEffect(() => {
    if (open) methods.reset({ code: '', name: '' });
  }, [methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      const country = await add.mutateAsync({ code: v.code.toUpperCase(), name: v.name });
      message.success(`${country.name} added. Create its regulation catalog next.`);
      onAdded(country);
      onClose();
    } catch (error) {
      methods.setError('form_error', {
        message: apiErrorMessage(error, "The country wasn't added. Try again."),
      });
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title="Add country">
      <FormWrapper
        methods={methods}
        isSubmitting={add.isPending}
        mode="add"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <p className="type-body-s m-0 text-ink-2">
              A country becomes a destination once its regulation catalog is published. Places,
              border crossings, corridors and rates for it are added separately.
            </p>
            <Flex gap={16}>
              <div className="w-32 shrink-0">
                <FormField
                  name="code"
                  label="Code"
                  component="text"
                  componentProps={{
                    isRequired: true,
                    maxLength: 2,
                    placeholder: 'US',
                    instruction: 'ISO 3166-1, two letters',
                    className: 'font-mono uppercase',
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <FormField
                  name="name"
                  label="Name"
                  component="text"
                  componentProps={{ isRequired: true, maxLength: 80, placeholder: 'United States' }}
                />
              </div>
            </Flex>
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Add country" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
