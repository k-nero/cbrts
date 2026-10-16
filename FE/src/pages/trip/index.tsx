import { useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Input, Select, Spin, Tag, Upload, message } from 'antd';
import type { UploadFile } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { tripApi } from '@/apis/trip';
import PageHeader from '@/components/PageHeader';
import apiV1Instance from '@/config/axios';
import { useTripRecord, useTrips } from '@/hooks/trip';
import type { HorseCondition, TripPhoto, TripRecordKind, TripView } from '@/interfaces';

const eventLabels: Record<TripRecordKind, string> = {
  LOADED: 'Loaded', DEPARTED: 'Departed', ARRIVED_AT_STOP: 'Arrived at checkpoint', CLEARED_BORDER: 'Customs cleared', HELD: 'On hold', LEFT_STOP: 'Left checkpoint', CONDITION_CHECK: 'Condition check', ACCEPTED_BY_AIRLINE: 'Accepted by airline', FLIGHT_DEPARTED: 'Flight departed', FLIGHT_LANDED: 'Flight landed', RELEASED_BY_AIRLINE: 'Released by airline', DELIVERED: 'Delivered', HANDED_OVER: 'Handed over', NOTE: 'Update',
};
const eventKinds = Object.keys(eventLabels) as TripRecordKind[];
const conditions: HorseCondition[] = ['SOUND', 'WATCH', 'CONCERN'];
const datetimeLocal = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); };
const formatTime = (value: string | null) => value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
const errorMessage = (error: unknown) => {
  const response = (error as AxiosError<{ message?: string; error?: string }>).response?.data;
  return response?.message ?? response?.error ?? (error instanceof Error ? error.message : 'Could not save the trip update.');
};

function Photo({ photo }: { photo: TripPhoto }) {
  const image = useQuery({
    queryKey: ['trip-photo', photo.id],
    queryFn: async () => {
      const path = photo.contentUrl.replace('/api/v1', '');
      const { data } = await apiV1Instance.get<Blob>(path, { responseType: 'blob' });
      return URL.createObjectURL(data);
    },
    staleTime: 60_000,
  });
  return image.data ? <a href={image.data} target="_blank" rel="noreferrer"><img src={image.data} alt={photo.fileName} className="size-20 rounded-md object-cover" /></a> : null;
}

function TripRecords({ trip }: { trip: TripView }) {
  const records = useMemo(() => [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), [trip.records]);
  return <Card title="Trip journey log">
    {records.length === 0 ? <p className="text-ink-3">No trip updates have been recorded yet.</p> : <ol className="m-0 list-none divide-y divide-line p-0">
      {records.map((record) => <li key={record.id} className="py-4">
        <div className="flex flex-wrap justify-between gap-2"><strong>{record.checkpointName ?? 'Trip update'} · {eventLabels[record.kind]}</strong><span className="text-sm text-ink-3">{formatTime(record.occurredAt)}</span></div>
        {record.text && <p className="mb-2 mt-1 text-sm text-ink-2">{record.text}</p>}
        {record.conditions.map((condition) => <div key={condition.horseId} className="mt-3 rounded-lg bg-raised p-3">
          <div className="flex flex-wrap justify-between gap-2"><strong>{condition.horseName}</strong><Tag color={condition.condition === 'CONCERN' ? 'red' : condition.condition === 'WATCH' ? 'orange' : 'green'}>{condition.condition}</Tag></div>
          <p className="mb-0 mt-1 text-sm text-ink-2">{[condition.drinking === null ? null : condition.drinking ? 'Drinking' : 'Not drinking', condition.eating === null ? null : condition.eating ? 'Eating' : 'Not eating', condition.note].filter(Boolean).join(' · ')}</p>
          {condition.photos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{condition.photos.map((photo) => <Photo key={photo.id} photo={photo} />)}</div>}
        </div>)}
      </li>)}
    </ol>}
  </Card>;
}

function TripDetails({ trip }: { trip: TripView }) {
  const lastRecord = [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  return <>
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Trip status"><div className="text-lg font-medium">{trip.tripStatus.replaceAll('_', ' ')}</div><p className="mb-0 mt-2 text-sm text-ink-3">Last update: {lastRecord ? `${lastRecord.checkpointName ?? 'Trip'} · ${formatTime(lastRecord.occurredAt)}` : 'No checkpoint update yet'}</p></Card>
      <Card title="Planned journey"><p className="m-0">{trip.origin ?? 'Origin not set'} → {trip.destination ?? 'Destination not set'}</p><p className="mb-0 mt-2 text-sm text-ink-3">Departure {formatTime(trip.plannedDepartureAt)} · Arrival {formatTime(trip.plannedArrivalAt)}</p></Card>
      <Card title="Transport"><p className="m-0">{trip.vehicleCode ?? 'Vehicle not assigned'}</p><p className="mb-0 mt-2 text-sm text-ink-3">{trip.clearanceReady ? 'Clearance ready' : 'Departure is waiting for clearance'}</p></Card>
    </div>
    <Card title="Route progress">
      {trip.stops.length === 0 ? <p className="text-ink-3">The confirmed route has no checkpoints yet.</p> : <ol className="m-0 list-none p-0">{trip.stops.map((stop) => <li key={stop.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-3 last:border-0">
        <div><strong>{stop.sequence}. {stop.name}</strong><p className="mb-0 mt-1 text-sm text-ink-3">{stop.details ?? stop.kind.replaceAll('_', ' ')} · Planned {formatTime(stop.plannedAt)}</p>{stop.latestNote && <p className="mb-0 mt-1 text-sm text-ink-2">{stop.latestNote}</p>}{stop.latestRecordedBy && <p className="mb-0 mt-1 text-xs text-ink-3">Recorded by {stop.latestRecordedBy} · {formatTime(stop.latestOccurredAt)}</p>}</div>
        <Tag color={stop.latestStatus ? 'blue' : 'default'}>{stop.latestStatus ? eventLabels[stop.latestStatus] : 'Waiting for update'}</Tag>
      </li>)}</ol>}
    </Card>
    <Card title="Horses on this trip"><div className="divide-y divide-line">{trip.horses.map((horse) => <div key={horse.id} className="flex justify-between gap-2 py-3"><strong>{horse.name}</strong><span className="text-sm text-ink-3">{horse.stall ?? 'Stall not assigned'}</span></div>)}</div></Card>
    <TripRecords trip={trip} />
  </>;
}

function TripWorkspace({ audience, title, summary, editable = false }: { audience: 'escort' | 'staff' | 'customer'; title: string; summary: string; editable?: boolean }) {
  const query = useTrips(audience);
  const [code, setCode] = useState('');
  const selectedCode = code || query.data?.[0]?.jobCode || '';
  const [kind, setKind] = useState<TripRecordKind>('ARRIVED_AT_STOP');
  const [stopId, setStopId] = useState<string>();
  const [occurredAt, setOccurredAt] = useState(datetimeLocal);
  const [text, setText] = useState('');
  const [conditionByHorse, setConditionByHorse] = useState<Record<string, { condition: HorseCondition; drinking: boolean; eating: boolean; note: string; photos: UploadFile[] }>>({});
  const mutation = useTripRecord(audience === 'staff' ? 'staff' : 'escort', selectedCode);
  const trip = query.data?.find((item) => item.jobCode === selectedCode);
  const [messageApi, contextHolder] = message.useMessage();
  const recordsCondition = async () => {
    if (!trip) return;
    try {
      const formConditions = await Promise.all(trip.horses.map(async (horse) => {
        const value = conditionByHorse[horse.id] ?? { condition: 'SOUND' as HorseCondition, drinking: true, eating: true, note: '', photos: [] };
        const photoFileIds = await Promise.all(value.photos.flatMap((f) => f.originFileObj ? [f.originFileObj] : []).map(async (file) => (await tripApi.uploadPhoto(file)).id));
        return { horseId: horse.id, condition: value.condition, drinking: value.drinking, eating: value.eating, note: value.note || undefined, photoFileIds };
      }));
      await mutation.mutateAsync({ routeStopId: stopId ?? null, kind: 'CONDITION_CHECK', occurredAt: new Date(occurredAt).toISOString(), clientRef: crypto.randomUUID(), text: text || undefined, conditions: formConditions });
      messageApi.success('Horse condition log saved.'); setText(''); setOccurredAt(datetimeLocal());
    } catch (error) { messageApi.error(errorMessage(error)); }
  };
  const submitRecord = async () => {
    if (!trip) return;
    try {
      await mutation.mutateAsync({ routeStopId: stopId ?? null, kind, occurredAt: new Date(occurredAt).toISOString(), clientRef: crypto.randomUUID(), text: text || undefined });
      messageApi.success('Trip checkpoint saved.'); setText(''); setOccurredAt(datetimeLocal());
    } catch (error) { messageApi.error(errorMessage(error)); }
  };
  return <div className="flex flex-col gap-6">
    {contextHolder}<PageHeader title={title} summary={summary} />
    {query.isPending && <div className="py-12 text-center"><Spin /></div>}
    {query.isError && <Alert type="error" showIcon message="Could not load trips" description={errorMessage(query.error)} />}
    {query.data && query.data.length === 0 && <Card><p className="m-0 text-ink-2">No trips are available for this account yet.</p></Card>}
    {trip && <>
      {query.data && query.data.length > 1 && <Select aria-label="Select trip" value={trip.jobCode} onChange={setCode} options={query.data.map((item) => ({ value: item.jobCode, label: `${item.jobCode} · ${item.origin ?? 'Origin'} → ${item.destination ?? 'Destination'}` }))} className="w-full" />}
      {audience === 'customer' && <Alert type="info" showIcon message="Progress follows recorded checkpoints" description="Trip location and progress update when the escort or coordinator records a checkpoint." />}
      {editable && <Card title={audience === 'escort' ? 'Report checkpoint and horse condition' : 'Update progress by checkpoint'}>
        {!trip.clearanceReady && <Alert className="mb-4" type="warning" showIcon message="Departure is locked until clearance is ready." />}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">Checkpoint<Select value={stopId} onChange={setStopId} allowClear placeholder="Trip-wide update" options={trip.stops.map((stop) => ({ value: stop.id, label: stop.name }))} /></label>
          <label className="flex flex-col gap-2 text-sm">Checkpoint status<Select value={kind} onChange={setKind} options={eventKinds.map((value) => ({ value, label: eventLabels[value] }))} /></label>
          <label className="flex flex-col gap-2 text-sm">Recorded time<input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} className="h-8 rounded-md border border-line-strong bg-input px-2" /></label>
          <label className="flex flex-col gap-2 text-sm">Update note<Input value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder="What happened at this checkpoint?" /></label>
        </div>
        {audience === 'escort' && <div className="mt-5 divide-y divide-line">{trip.horses.map((horse) => {
          const value = conditionByHorse[horse.id] ?? { condition: 'SOUND' as HorseCondition, drinking: true, eating: true, note: '', photos: [] };
          const update = (patch: Partial<typeof value>) => setConditionByHorse((current) => ({ ...current, [horse.id]: { ...value, ...patch } }));
          return <section key={horse.id} className="grid gap-3 py-4 md:grid-cols-2"><div><strong>{horse.name}</strong><p className="m-0 text-sm text-ink-3">{horse.stall ?? 'Stall not assigned'}</p></div>
            <Select aria-label={`${horse.name} condition`} value={value.condition} onChange={(condition: HorseCondition) => update({ condition })} options={conditions.map((condition) => ({ value: condition, label: condition }))} />
            <div className="flex gap-5"><Checkbox checked={value.drinking} onChange={(event) => update({ drinking: event.target.checked })}>Drinking</Checkbox><Checkbox checked={value.eating} onChange={(event) => update({ eating: event.target.checked })}>Eating</Checkbox></div>
            <Input value={value.note} onChange={(event) => update({ note: event.target.value })} maxLength={500} placeholder="Condition note (optional)" />
            <Upload accept="image/jpeg,image/png,image/heic,image/heif" multiple maxCount={8} fileList={value.photos} beforeUpload={() => false} onChange={({ fileList }) => update({ photos: fileList })}><Button>Attach condition photos</Button></Upload>
          </section>;
        })}</div>}
        <div className="mt-4 flex flex-wrap justify-end gap-2"><Button loading={mutation.isPending} onClick={submitRecord}>Save checkpoint</Button>{audience === 'escort' && <Button type="primary" loading={mutation.isPending} onClick={recordsCondition}>Save horse condition log</Button>}</div>
      </Card>}
      <TripDetails trip={trip} />
    </>}
  </div>;
}

export function CustomerTripPage() { return <TripWorkspace audience="customer" title="Trip tracking" summary="Follow recorded checkpoints and horse condition updates for your club's trips." />; }
export function StaffTripPage() { return <TripWorkspace audience="staff" editable title="Trip progress" summary="Track each active journey and record progress by confirmed route checkpoint." />; }
export function EscortTripPage() { return <TripWorkspace audience="escort" editable title="Cab trip log" summary="Record assigned trip checkpoints and each horse's condition from the escort cab." />; }
