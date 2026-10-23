import { useRef, useState } from 'react';
import type { UploadFile } from 'antd';
import { Input, Select, Upload } from 'antd';

import { fileApi } from '@/apis/file';
import { Button, Checkbox } from '@/components/ui';
import type { HorseCondition, TripView } from '@/interfaces';
import { HorseConditionEnum } from '@/interfaces';

export type ObservationState = {
  checked: boolean;
  condition: HorseCondition | null;
  drinking: boolean | null;
  eating: boolean | null;
  note: string;
  photos: UploadFile[];
};

export const emptyObservation = (): ObservationState => ({
  checked: false,
  condition: null,
  drinking: null,
  eating: null,
  note: '',
  photos: [],
});

export function HorseConditionForm({
  trip,
  isPending,
  onSave,
  onError,
}: {
  trip: TripView;
  isPending: boolean;
  onSave: (
    conditions: Array<{
      horseId: string;
      condition: HorseCondition;
      drinking: boolean | null;
      eating: boolean | null;
      note?: string;
      photoFileIds: string[];
    }>,
  ) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [conditionByHorse, setConditionByHorse] = useState<Record<string, ObservationState>>({});
  const uploadedPhotos = useRef(new Map<string, string>());

  const updateObservation = (horseId: string, update: Partial<ObservationState>) => {
    setConditionByHorse((current) => ({
      ...current,
      [horseId]: { ...emptyObservation(), ...current[horseId], ...update },
    }));
  };

  const handleSave = async () => {
    const checked = trip.horses.flatMap((horse) => {
      const observation = conditionByHorse[horse.id];
      return observation?.checked ? [{ horse, observation }] : [];
    });
    if (checked.length === 0) {
      onError('Select each horse you actually checked before saving.');
      return;
    }
    if (checked.some(({ observation }) => observation.condition === null)) {
      onError('Choose an observed condition for every selected horse.');
      return;
    }

    const conditions = await Promise.all(
      checked.map(async ({ horse, observation }) => {
        const photoFileIds: string[] = [];
        for (const upload of observation.photos) {
          if (!upload.originFileObj) continue;
          const existingId = uploadedPhotos.current.get(upload.uid);
          if (existingId) {
            photoFileIds.push(existingId);
            continue;
          }
          const id = (await fileApi.upload(upload.originFileObj)).id;
          uploadedPhotos.current.set(upload.uid, id);
          photoFileIds.push(id);
        }
        return {
          horseId: horse.id,
          condition: observation.condition!,
          drinking: observation.drinking,
          eating: observation.eating,
          note: observation.note || undefined,
          photoFileIds,
        };
      }),
    );

    await onSave(conditions);
    setConditionByHorse({});
  };

  const hasAnyChecked = trip.horses.some((horse) => conditionByHorse[horse.id]?.checked);

  return (
    <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
      <div className="divide-y divide-line">
        {trip.horses.map((horse) => {
          const observation = conditionByHorse[horse.id] ?? emptyObservation();
          return (
            <section key={horse.id} className="grid gap-3 py-4 md:grid-cols-2">
              <div>
                <strong className="type-h4">{horse.name}</strong>
                <p className="type-body-s m-0 text-ink-3">{horse.stall ?? 'Stall not assigned'}</p>
              </div>
              <Checkbox
                label="I checked this horse"
                checked={observation.checked}
                onChange={(event) => updateObservation(horse.id, { checked: event.target.checked })}
              />
              <Select
                aria-label={`${horse.name} condition`}
                allowClear
                placeholder="Observed condition"
                value={observation.condition ?? undefined}
                onChange={(value?: HorseCondition) =>
                  updateObservation(horse.id, { condition: value ?? null })
                }
                options={[
                  { value: HorseConditionEnum.STABLE, label: 'Stable' },
                  { value: HorseConditionEnum.OFF_FEED, label: 'Off feed' },
                  { value: HorseConditionEnum.STRESSED, label: 'Stressed' },
                  { value: HorseConditionEnum.CLIMATE_CHANGE, label: 'Climate change' },
                ]}
              />
              <div className="grid grid-cols-2 gap-3">
                {(['drinking', 'eating'] as const).map((field) => (
                  <label key={field} className="type-body-s flex flex-col gap-1">
                    {field === 'drinking' ? 'Drinking' : 'Eating'}
                    <Select
                      allowClear
                      placeholder="Not recorded"
                      value={
                        observation[field] === null ? undefined : observation[field] ? 'YES' : 'NO'
                      }
                      onChange={(value?: 'YES' | 'NO') =>
                        updateObservation(horse.id, {
                          [field]: value === undefined ? null : value === 'YES',
                        })
                      }
                      options={[
                        { value: 'YES', label: 'Yes' },
                        { value: 'NO', label: 'No' },
                      ]}
                    />
                  </label>
                ))}
              </div>
              <Input
                value={observation.note}
                onChange={(event) => updateObservation(horse.id, { note: event.target.value })}
                maxLength={500}
                placeholder="Condition note (optional)"
              />
              <Upload
                accept="image/jpeg,image/png,image/heic,image/heif"
                multiple
                maxCount={8}
                fileList={observation.photos}
                beforeUpload={() => false}
                onChange={({ fileList }) => updateObservation(horse.id, { photos: fileList })}
              >
                <Button type="button" size="sm" leadingIcon="upload">
                  Attach photos
                </Button>
              </Upload>
            </section>
          );
        })}
      </div>
      <div className="flex justify-end pt-2">
        <Button variant="primary" disabled={isPending || !hasAnyChecked} onClick={handleSave}>
          {isPending ? 'Saving…' : 'Save checked horse conditions'}
        </Button>
      </div>
    </div>
  );
}
