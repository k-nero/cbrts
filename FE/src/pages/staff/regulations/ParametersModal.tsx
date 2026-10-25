import { type FC, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Col, Flex, Row } from 'antd';

import { DEFAULT_PARAMETERS } from './constants';
import { type ParametersForm, parametersSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { useCreateRegulationCatalog, useUpdateRegulationParameters } from '@/hooks/regulation';
import type { RegulationCountry, RegulationVersion } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
} & (
  | { /** Create this country's catalog with a first draft. */ country: RegulationCountry; draft?: never }
  | { /** Change this draft's parameters. */ draft: RegulationVersion; country?: never }
);

/**
 * A version's lead times, quarantine minimum and arrival buffer: the first draft of a new country's
 * catalog, or a draft's change.
 */
export const ParametersModal: FC<Props> = ({ open, onClose, country, draft }) => {
  const { message } = App.useApp();
  const create = useCreateRegulationCatalog();
  const update = useUpdateRegulationParameters();
  const methods = useFormCustom<ParametersForm>({ resolver: zodResolver(parametersSchema) });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      draft
        ? {
            leadTimeDays: draft.leadTimeDays,
            domesticLeadTimeDays: draft.domesticLeadTimeDays,
            quarantineMinDays: draft.quarantineMinDays,
            arrivalBufferDays: draft.arrivalBufferDays,
          }
        : DEFAULT_PARAMETERS,
    );
  }, [draft, methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      if (country) {
        await create.mutateAsync({ countryId: country.id, data: v });
        message.success(`Draft v1 of the ${country.name} catalog created. Add its document rules.`);
      } else {
        await update.mutateAsync({ versionId: draft.id, data: v });
        message.success(`Draft v${draft.versionNo} saved`);
      }
      onClose();
    } catch (error) {
      methods.setError('form_error', {
        message: apiErrorMessage(error, "Nothing was saved. Try again."),
      });
    }
  });

  return (
    <BaseModal
      open={open}
      onCancel={onClose}
      title={country ? `Create catalog · ${country.name}` : `Parameters · draft v${draft.versionNo}`}
    >
      <FormWrapper
        methods={methods}
        isSubmitting={create.isPending || update.isPending}
        mode={country ? 'add' : 'edit'}
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            {country && (
              <p className="type-body-s m-0 text-ink-2">
                The catalog starts as draft v1 with no document rules. Jobs into {country.name} can
                get a clearance checklist once v1 is published.
              </p>
            )}
            <Row gutter={16}>
              <Col span={12}>
                <FormField
                  name="leadTimeDays"
                  label="Lead time, cross-border (days)"
                  component="number"
                  componentProps={{ isRequired: true, min: 1, max: 365 }}
                />
              </Col>
              <Col span={12}>
                <FormField
                  name="domesticLeadTimeDays"
                  label="Lead time, domestic (days)"
                  component="number"
                  componentProps={{ isRequired: true, min: 1, max: 365 }}
                />
              </Col>
              <Col span={12}>
                <FormField
                  name="quarantineMinDays"
                  label="Quarantine minimum (days)"
                  component="number"
                  componentProps={{ isRequired: true, min: 0, max: 365 }}
                />
              </Col>
              <Col span={12}>
                <FormField
                  name="arrivalBufferDays"
                  label="Arrival buffer (days)"
                  component="number"
                  componentProps={{ isRequired: true, min: 0, max: 365 }}
                />
              </Col>
            </Row>
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton
                type="primary"
                label={country ? 'Create catalog' : 'Save to draft'}
              />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
