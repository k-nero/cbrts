import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';
import { useWatch } from 'react-hook-form';

import { type OptionForm, optionSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useAddIncidentOption } from '@/hooks/incident';
import type { Incident, LeavingKind } from '@/interfaces';
import { LeavingKindEnum } from '@/interfaces';
import { useActiveVehicles } from '@/hooks/useVehicle';
import { apiErrorMessage } from '@/lib/utils';

const EMPTY: OptionForm = {
  title: '',
  description: '',
  extraCost: 0,
  delayMinutes: 0,
  changesRoute: false,
  leavingKind: null,
  horseIds: [],
  leavingPlace: '',
  vehicle: null,
  customerPays: false,
};

/** The ways horses leave a moving trip (US-F5-06), as the option offers them. */
const LEAVING = [
  { value: LeavingKindEnum.UNLOAD, label: 'Unload at a safe place, continue later' },
  { value: LeavingKindEnum.SECOND_VEHICLE, label: 'Send a second vehicle' },
  { value: LeavingKindEnum.RETURN_TO_ORIGIN, label: 'Return to origin' },
  { value: LeavingKindEnum.LEAVE_IN_CARE, label: 'Leave in care' },
];

/** Record an option for handling the incident (US-F5-02), with its estimated cost and delay. */
export const AddOptionModal: FC<{ incident: Incident; open: boolean; onClose: () => void }> = ({
  incident,
  open,
  onClose,
}) => {
  const { message } = App.useApp();
  const add = useAddIncidentOption(incident.id);
  const { data: vehicles } = useActiveVehicles();
  const methods = useFormCustom<OptionForm>({
    resolver: zodResolver(optionSchema),
    defaultValues: EMPTY,
  });

  const close = () => {
    add.reset();
    methods.reset(EMPTY);
    onClose();
  };

  const leavingKind = useWatch({ control: methods.control, name: 'leavingKind' })?.value as
    LeavingKind | undefined;
  const onSubmit = methods.handleSubmit((v) =>
    add.mutate(
      {
        title: v.title,
        description: v.description || undefined,
        extraCost: v.extraCost,
        delayMinutes: v.delayMinutes,
        changesRoute: v.changesRoute,
        customerPays: v.customerPays,
        leavingKind: (v.leavingKind?.value as LeavingKind | undefined) ?? undefined,
        horseIds: v.leavingKind ? v.horseIds : undefined,
        leavingPlace: v.leavingKind ? v.leavingPlace || undefined : undefined,
        vehicleId: v.leavingKind?.value === 'SECOND_VEHICLE' ? v.vehicle?.value : undefined,
      },
      {
        onSuccess: () => {
          message.success(`“${v.title}” added to the options.`);
          close();
        },
      },
    ),
  );

  return (
    <BaseModal open={open} onCancel={close} title="Add an option">
      <FormWrapper
        methods={methods}
        isSubmitting={add.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <FormField
              name="title"
              label="Option"
              component="text"
              componentProps={{
                isRequired: true,
                maxLength: 160,
                placeholder: 'Send a second trailer from Tây Ninh',
              }}
            />
            <FormField
              name="description"
              label="What it involves (optional)"
              component="textarea"
              componentProps={{ rows: 3, maxLength: 1000 }}
            />
            <Flex gap={16}>
              <FormField
                name="extraCost"
                label={`Estimated extra cost, ${incident.currency}`}
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 50 }}
              />
              <FormField
                name="delayMinutes"
                label="Added to the arrival, minutes"
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 15 }}
              />
            </Flex>
            <FormField
              name="changesRoute"
              component="checkbox"
              componentProps={{ children: 'It takes the horses another way (a new route version)' }}
            />
            <FormField
              name="customerPays"
              component="checkbox"
              componentProps={{
                children: 'The customer pays the extra cost (the manager decides)',
              }}
            />
            {incident.riding.length > 0 && (
              <FormField
                name="leavingKind"
                label={`Horses leave the trip (after departure, only an incident moves them)`}
                component="select"
                componentProps={{
                  options: LEAVING,
                  isClearable: true,
                  placeholder: 'No horse leaves',
                }}
              />
            )}
            {leavingKind && (
              <>
                <FormField
                  name="horseIds"
                  label={`Which of ${incident.jobCode}'s horses (none ticked: all of them)`}
                  component="checkbox-group"
                  componentProps={{
                    options: incident.riding.map((h) => ({ value: h.id, label: h.name })),
                  }}
                />
                {(leavingKind === 'UNLOAD' || leavingKind === 'LEAVE_IN_CARE') && (
                  <FormField
                    name="leavingPlace"
                    label="Where they go"
                    component="text"
                    componentProps={{
                      isRequired: true,
                      maxLength: 200,
                      placeholder: 'Gò Dầu equine clinic',
                    }}
                  />
                )}
                {leavingKind === 'SECOND_VEHICLE' && (
                  <FormField
                    name="vehicle"
                    label="Second vehicle"
                    component="select"
                    componentProps={{
                      isRequired: true,
                      options: (vehicles ?? []).map((v) => ({ value: v.id, label: v.code })),
                    }}
                  />
                )}
              </>
            )}
            {add.isError && (
              <Callout tone="bad" title="The option wasn’t added">
                {apiErrorMessage(add.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton label="Add option" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
