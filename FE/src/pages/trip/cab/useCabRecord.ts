import { useRef } from 'react';
import { App } from 'antd';
import type { Dayjs } from 'dayjs';

import type { Observation } from './observation';

import { fileApi } from '@/apis/file';
import { useTripRecord } from '@/hooks/trip';
import type { TripHorse, TripRecordInput } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

type Save = Omit<TripRecordInput, 'clientRef' | 'occurredAt' | 'conditions'> & {
  at: Dayjs;
  observed?: { horse: TripHorse; observation: Observation }[];
};

/**
 * Saves one cab record. Its client reference is kept across a failed send, so saving again after a
 * lost signal records it once; photos already uploaded aren't sent twice.
 */
export const useCabRecord = (jobCode: string, tripCode?: string) => {
  const { message } = App.useApp();
  const mutation = useTripRecord('escort', jobCode, tripCode);
  const clientRef = useRef<string | null>(null);
  const uploaded = useRef(new Map<string, string>());

  const save = async ({ at, observed, ...input }: Save, done: string) => {
    clientRef.current = clientRef.current ?? crypto.randomUUID();
    try {
      const conditions = observed
        ? await Promise.all(
            observed.map(async ({ horse, observation }) => {
              const photoFileIds: string[] = [];
              for (const photo of observation.photos) {
                if (!photo.originFileObj) continue;
                const id =
                  uploaded.current.get(photo.uid) ?? (await fileApi.upload(photo.originFileObj)).id;
                uploaded.current.set(photo.uid, id);
                photoFileIds.push(id);
              }
              return {
                horseId: horse.id,
                condition: observation.condition!,
                drinking: observation.drinking,
                eating: observation.eating,
                note: observation.note.trim() || undefined,
                photoFileIds,
              };
            }),
          )
        : undefined;
      await mutation.mutateAsync({
        ...input,
        occurredAt: at.toISOString(),
        clientRef: clientRef.current,
        conditions,
      });
      clientRef.current = null;
      uploaded.current.clear();
      message.success(done);
      return true;
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          'Not sent. Keep this page open and save again: it is recorded once.',
        ),
      );
      return false;
    }
  };

  return { save, saving: mutation.isPending };
};
