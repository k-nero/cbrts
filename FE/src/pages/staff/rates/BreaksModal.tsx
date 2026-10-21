import { type FC, useEffect } from 'react';
import { useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type BandsForm, bandsSchema } from './schema';
import { type OnDraftGone, refuse } from './editorOptions';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Button } from '@/components/ui';
import { usePutVolumeBreaks } from '@/hooks/rates';
import type { RateCorridorView } from '@/interfaces';
import { bandRefusal, bandsSave } from '@/lib/utils';

/** Edit the volume breaks as a whole: this corridor's own bands, or the bands for every corridor. */
export const BreaksModal: FC<{
  open: boolean;
  view: RateCorridorView;
  onClose: () => void;
  onDraftGone: OnDraftGone;
}> = ({ open, view, onClose, onDraftGone }) => {
  const { message } = App.useApp();
  const put = usePutVolumeBreaks();
  const methods = useFormCustom<BandsForm>({ resolver: zodResolver(bandsSchema) });
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'bands' });

  useEffect(() => {
    if (!open) return;
    methods.reset({
      ownBands: view.volumeBreaksScope === 'CORRIDOR',
      bands: view.volumeBreaks.map((b) => ({ ...b })),
    });
  }, [methods, open, view]);

  const onSubmit = methods.handleSubmit(async (v) => {
    const save = bandsSave(view.volumeBreaksScope, v.ownBands, v.bands);
    // An empty corridor list only removes the corridor's own bands; anything else must be a valid set.
    const refusal = save.corridorScoped && save.bands.length === 0 ? null : bandRefusal(save.bands);
    if (refusal) {
      methods.setError('form_error', { message: refusal });
      return;
    }
    try {
      await put.mutateAsync({
        corridorId: save.corridorScoped ? view.corridor.id : null,
        bands: save.bands,
        view: view.corridor.id,
      });
      message.success('Volume breaks saved to the draft');
      onClose();
    } catch (error) {
      if (onDraftGone(error)) return onClose();
      // The bands are edited as a set: every refusal is about the whole list.
      refuse(error, {}, [], (name, msg) => methods.setError(name as never, { message: msg }));
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title="Volume breaks">
      <FormWrapper
        methods={methods}
        isSubmitting={put.isPending}
        mode="edit"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="ownBands"
              component="checkbox"
              componentProps={{
                children: `Bands for ${view.corridor.code} only (leave them empty to use the bands for every corridor)`,
              }}
            />
            {fields.map((f, i) => (
              <Flex key={f.id} gap={12} align="end">
                <FormField
                  name={`bands.${i}.minHorses`}
                  label="From horses"
                  component="number"
                  componentProps={{ min: 1 }}
                />
                <FormField
                  name={`bands.${i}.maxHorses`}
                  label="To horses"
                  component="number"
                  componentProps={{ min: 1, placeholder: 'and up' }}
                />
                <FormField
                  name={`bands.${i}.discountPct`}
                  label="Discount, %"
                  component="number"
                  componentProps={{ min: 0, max: 100, step: 0.5 }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove band ${i + 1}`}
                  onClick={() => remove(i)}
                >
                  Remove
                </Button>
              </Flex>
            ))}
            <Flex justify="space-between" gap={8}>
              <Button
                size="sm"
                variant="secondary"
                leadingIcon="plus"
                onClick={() => append({ minHorses: null, maxHorses: null, discountPct: 0 })}
              >
                Add band
              </Button>
              <Flex gap={8}>
                <CancelButton label="Cancel" />
                <SubmitButton type="primary" label="Save to draft" />
              </Flex>
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
