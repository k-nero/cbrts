import { type FC, useRef, useState } from 'react';
import type { UploadFile } from 'antd';
import { App, Col, DatePicker, Flex, Input, Row, Select, Upload } from 'antd';
import dayjs from 'dayjs';

import { sentence } from './tripFormat';

import { fileApi } from '@/apis/file';
import { Button, Callout, Checkbox, Panel } from '@/components/ui';
import { useTripRecord } from '@/hooks/trip';
import type { HorseCondition, TripView } from '@/interfaces';
import { HorseConditionEnum, TripRecordKindEnum } from '@/interfaces';
import { apiErrorMessage, formatTime as hhmm } from '@/lib/utils';

type HorseState = { condition: HorseCondition | null; note: string; photos: UploadFile[] };

type Props = { trip: TripView; code: string; tripId?: string };

/**
 * The handover at the destination (US-F6-01, DESIGN.md "Handover (escort)"): each horse's condition on arrival with
 * photos, what was handed over, and the receiver's name with their confirmation. It is recorded once and never
 * changed; the gold action names the time it records. The office records it here for the escort;
 * the cab has its own (cab/HandoverTask).
 */
export const HandoverPanel: FC<Props> = ({ trip, code, tripId }) => {
  const { message } = App.useApp();
  const record = useTripRecord('staff', code, tripId);
  const horses = trip.horses.filter((h) => h.jobCode === trip.jobCode);
  const [byHorse, setByHorse] = useState<Record<string, HorseState>>({});
  const [items, setItems] = useState('');
  const [receiver, setReceiver] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [at, setAt] = useState(dayjs);
  const clientRef = useRef<string | null>(null);
  const uploaded = useRef(new Map<string, string>());

  const horse = (id: string): HorseState =>
    byHorse[id] ?? { condition: null, note: '', photos: [] };
  const update = (id: string, change: Partial<HorseState>) =>
    setByHorse((current) => ({ ...current, [id]: { ...horse(id), ...change } }));

  const missing = horses.filter((h) => !horse(h.id).condition).map((h) => h.name);
  const ready = missing.length === 0 && receiver.trim() !== '' && confirmed;

  const save = async () => {
    clientRef.current = clientRef.current ?? crypto.randomUUID();
    try {
      const conditions = await Promise.all(
        horses.map(async (h) => {
          const state = horse(h.id);
          const photoFileIds: string[] = [];
          for (const photo of state.photos) {
            if (!photo.originFileObj) continue;
            const known = uploaded.current.get(photo.uid);
            const id = known ?? (await fileApi.upload(photo.originFileObj)).id;
            uploaded.current.set(photo.uid, id);
            photoFileIds.push(id);
          }
          return {
            horseId: h.id,
            condition: state.condition!,
            drinking: null,
            eating: null,
            note: state.note || undefined,
            photoFileIds,
          };
        }),
      );
      await record.mutateAsync({
        routeStopId: null,
        kind: TripRecordKindEnum.HANDED_OVER,
        occurredAt: at.toISOString(),
        clientRef: clientRef.current,
        text: items.trim() || undefined,
        receiverName: receiver.trim(),
        receiverConfirmed: confirmed,
        conditions,
      });
      clientRef.current = null;
      message.success(`Handover recorded: ${receiver.trim()} received ${trip.jobCode}.`);
    } catch (error) {
      message.error(apiErrorMessage(error, 'The handover could not be saved.'));
    }
  };

  return (
    <Panel title={`Hand over ${trip.jobCode}`}>
      <Flex vertical gap={20}>
        <p className="type-body-m m-0 text-ink-2">
          Record each horse as it is handed over, then the receiver confirms on this tablet. It is
          recorded once; the customer then has 2 days to accept it or report a problem.
        </p>
        <div className="divide-y divide-line rounded-lg border border-line">
          {horses.map((h) => {
            const state = horse(h.id);
            return (
              <Row key={h.id} gutter={[12, 12]} align="middle" className="px-4 py-3">
                <Col xs={24} md={6}>
                  <strong className="type-h4">{h.name}</strong>
                </Col>
                <Col xs={24} md={6}>
                  <Select
                    aria-label={`${h.name} condition on arrival`}
                    className="w-full"
                    placeholder="Condition on arrival"
                    value={state.condition ?? undefined}
                    onChange={(condition: HorseCondition) => update(h.id, { condition })}
                    options={Object.values(HorseConditionEnum).map((c) => ({
                      value: c,
                      label: sentence(c),
                    }))}
                  />
                </Col>
                <Col xs={24} md={7}>
                  <Input
                    value={state.note}
                    maxLength={500}
                    placeholder="Note (optional)"
                    onChange={(e) => update(h.id, { note: e.target.value })}
                  />
                </Col>
                <Col xs={24} md={5}>
                  <Upload
                    accept="image/jpeg,image/png,image/heic,image/heif"
                    multiple
                    maxCount={8}
                    fileList={state.photos}
                    beforeUpload={() => false}
                    onChange={({ fileList }) => update(h.id, { photos: fileList })}
                  >
                    <Button type="button" size="sm" leadingIcon="upload">
                      Photos
                    </Button>
                  </Upload>
                </Col>
              </Row>
            );
          })}
        </div>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Flex component="label" vertical gap={8} className="type-body-s">
              What was handed over
              <Input
                value={items}
                maxLength={500}
                placeholder="Passports, head collars, feed for two days"
                onChange={(e) => setItems(e.target.value)}
              />
            </Flex>
          </Col>
          <Col xs={24} md={6}>
            <Flex component="label" vertical gap={8} className="type-body-s">
              Received by
              <Input
                value={receiver}
                maxLength={120}
                placeholder="Name and role"
                onChange={(e) => setReceiver(e.target.value)}
              />
            </Flex>
          </Col>
          <Col xs={24} md={6}>
            <Flex component="label" vertical gap={8} className="type-body-s">
              Handed over at
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="D MMM YYYY, HH:mm"
                allowClear={false}
                value={at}
                disabledDate={(day) => day.isAfter(dayjs(), 'day')}
                onChange={(value) => value && setAt(value)}
              />
            </Flex>
          </Col>
        </Row>
        <Checkbox
          label={`${receiver.trim() || 'The receiver'} confirms they received ${
            horses.length === 1 ? 'this horse' : `these ${horses.length} horses`
          } in the condition recorded above`}
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        {missing.length > 0 && (
          <Callout tone="info" title="Still to record">
            The condition of {missing.join(', ')}.
          </Callout>
        )}
        <Flex justify="end">
          <Button variant="primary" disabled={!ready || record.isPending} onClick={save}>
            {record.isPending ? 'Saving…' : `Record the handover at ${hhmm(at.toISOString())}`}
          </Button>
        </Flex>
      </Flex>
    </Panel>
  );
};
