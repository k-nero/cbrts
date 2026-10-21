import { type FC, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type ClassForm, classSchema } from './schema';
import { CLASSES, type OnDraftGone, refuse } from './editorOptions';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { usePutServiceClass } from '@/hooks/rates';
import type { RateCorridorView, ServiceClass, ServiceClassRow } from '@/interfaces';

/** Set an air stall class's width per horse and position rate; horses per position follow from the width. */
export const ClassModal: FC<{
  open: boolean;
  editing: ServiceClassRow | null;
  view: RateCorridorView;
  onClose: () => void;
  onDraftGone: OnDraftGone;
}> = ({ open, editing, view, onClose, onDraftGone }) => {
  const { message } = App.useApp();
  const put = usePutServiceClass();
  const methods = useFormCustom<ClassForm>({ resolver: zodResolver(classSchema) });
  const free = CLASSES.filter((c) => !view.serviceClasses.some((s) => s.serviceClass === c.value));

  useEffect(() => {
    if (!open) return;
    methods.reset({
      serviceClass: CLASSES.find((c) => c.value === editing?.serviceClass) ?? free[0] ?? CLASSES[0],
      widthPerHorseIn: editing?.widthPerHorseIn ?? (null as unknown as number),
      positionRate: editing?.positionRate ?? (null as unknown as number),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await put.mutateAsync({
        corridorId: view.corridor.id,
        serviceClass: v.serviceClass.value as ServiceClass,
        body: { widthPerHorseIn: v.widthPerHorseIn, positionRate: v.positionRate },
      });
      message.success('Class saved to the draft');
      onClose();
    } catch (error) {
      if (onDraftGone(error)) return onClose();
      refuse(
        error,
        { WIDTH_PER_HORSE_IN: 'widthPerHorseIn' },
        ['serviceClass', 'widthPerHorseIn', 'positionRate'],
        (name, msg, focus) =>
          methods.setError(name as never, { message: msg }, { shouldFocus: focus }),
      );
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title={editing ? 'Edit class' : 'Add class'}>
      <FormWrapper
        methods={methods}
        isSubmitting={put.isPending}
        mode={editing ? 'edit' : 'add'}
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="serviceClass"
              label="Class"
              component="select"
              componentProps={{
                isRequired: true,
                options: editing ? CLASSES : free,
                isDisabled: Boolean(editing),
              }}
            />
            <Flex gap={16}>
              <FormField
                name="widthPerHorseIn"
                label="Width per horse, in"
                component="number"
                componentProps={{
                  isRequired: true,
                  min: 1,
                  max: 96,
                  instruction: 'One position is 96 in.',
                }}
              />
              <FormField
                name="positionRate"
                label="Position rate, USD"
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 0.01 }}
              />
            </Flex>
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Save to draft" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
