import { useRef, useState } from 'react';
import type { UploadFile } from 'antd';
import { Col, Flex, Input, Row, Select, Upload } from 'antd';

import { formatTime } from './tripFormat';

import { fileApi } from '@/apis/file';
import { Button, Callout, OptionCard, Panel, type IconName } from '@/components/ui';
import { useRaiseIncident } from '@/hooks/incident';
import type { Incident, IncidentKind, TripView } from '@/interfaces';
import { IncidentKindEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/** The emergencies the cab reports (US-F5-01), in the order a driver meets them. */
const KINDS: { kind: IncidentKind; title: string; icon: IconName; description: string }[] = [
  {
    kind: IncidentKindEnum.VEHICLE,
    title: 'Vehicle breakdown',
    icon: 'truck',
    description: 'The truck or trailer can’t go on safely.',
  },
  {
    kind: IncidentKindEnum.TRAFFIC,
    title: 'Prolonged traffic jam',
    icon: 'clock',
    description: 'Stuck long enough to threaten the welfare stops or arrival.',
  },
  {
    kind: IncidentKindEnum.WELFARE,
    title: 'Horse medical incident',
    icon: 'medical',
    description: 'Injury, colic, distress or anything a vet should hear about.',
  },
  {
    kind: IncidentKindEnum.OTHER,
    title: 'Other emergency',
    icon: 'alert',
    description: 'Anything else the office must act on now.',
  },
];

/**
 * Report an emergency from the cab (US-F5-01): the kind, where, what happened and photos, in a few taps. Saving opens
 * an incident and alerts the logistics manager and the coordinator at once; the cab says who was told and when.
 */
export function ReportEmergency({ trip }: { trip: TripView }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<IncidentKind>();
  const [horseId, setHorseId] = useState<string>();
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<UploadFile[]>([]);
  const [error, setError] = useState<string>();
  const [reported, setReported] = useState<Incident>();
  // One reference per report, kept across a failed send so a retry can't open a second incident.
  const clientRef = useRef<string | null>(null);
  const uploaded = useRef(new Map<string, string>());
  const raise = useRaiseIncident(trip.jobCode);

  const needsHorse = kind === IncidentKindEnum.WELFARE;
  const ready =
    kind !== undefined && location.trim() && description.trim() && (!needsHorse || horseId);

  const reset = () => {
    setKind(undefined);
    setHorseId(undefined);
    setLocation('');
    setDescription('');
    setPhotos([]);
    setError(undefined);
    clientRef.current = null;
    uploaded.current.clear();
  };

  const send = async () => {
    if (!kind) return;
    clientRef.current = clientRef.current ?? crypto.randomUUID();
    setError(undefined);
    try {
      const photoFileIds: string[] = [];
      for (const photo of photos) {
        if (!photo.originFileObj) continue;
        const id =
          uploaded.current.get(photo.uid) ?? (await fileApi.upload(photo.originFileObj)).id;
        uploaded.current.set(photo.uid, id);
        photoFileIds.push(id);
      }
      const incident = await raise.mutateAsync({
        kind,
        location: location.trim(),
        description: description.trim(),
        horseId: horseId || undefined,
        photoFileIds,
        clientRef: clientRef.current,
        occurredAt: new Date().toISOString(),
      });
      reset();
      setOpen(false);
      setReported(incident);
    } catch (e) {
      setError(
        apiErrorMessage(e, 'The emergency could not be sent. Try again, or call the office.'),
      );
    }
  };

  if (!open) {
    return (
      <Panel>
        <Flex vertical gap={16}>
          {reported && (
            <Callout tone="bad" title={`${reported.kindLabel} reported`}>
              {[reported.ownerName, reported.coordinatorName].filter(Boolean).join(' and ')} were
              alerted at {formatTime(reported.openedAt)}. Keep the horses safe and wait for the
              office’s call.
            </Callout>
          )}
          <Flex wrap align="center" justify="space-between" gap={12}>
            <div>
              <h2 className="type-h4 m-0">Something wrong on the road?</h2>
              <p className="type-body-s m-0 text-ink-3">
                Report it here and the office is alerted at once.
              </p>
            </div>
            <Button variant="danger" leadingIcon="alert" onClick={() => setOpen(true)}>
              Report an emergency
            </Button>
          </Flex>
        </Flex>
      </Panel>
    );
  }

  return (
    <Panel title="Report an emergency">
      <Flex vertical gap={20}>
        <Row gutter={[12, 12]}>
          {KINDS.map((option) => (
            <Col key={option.kind} xs={24} md={12} xl={6}>
              <OptionCard
                name="incident-kind"
                value={option.kind}
                selected={kind === option.kind}
                onChange={() => setKind(option.kind)}
                icon={option.icon}
                title={option.title}
                description={option.description}
                className="h-full"
              />
            </Col>
          ))}
        </Row>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Flex component="label" vertical gap={8} className="type-body-s">
              Where are you?
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                maxLength={200}
                placeholder="Road and kilometre, or the nearest town"
              />
            </Flex>
          </Col>
          <Col xs={24} md={12}>
            <Flex component="label" vertical gap={8} className="type-body-s">
              {needsHorse ? 'Which horse?' : 'Which horse? (if it concerns one)'}
              <Select
                allowClear={!needsHorse}
                value={horseId}
                onChange={setHorseId}
                placeholder="Choose the horse"
                options={trip.horses.map((horse) => ({ value: horse.id, label: horse.name }))}
              />
            </Flex>
          </Col>
          <Col span={24}>
            <Flex component="label" vertical gap={8} className="type-body-s">
              What happened?
              <Input.TextArea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                showCount
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder="What you see, and what you have done so far"
              />
            </Flex>
          </Col>
          <Col span={24}>
            <Upload
              accept="image/jpeg,image/png,image/heic,image/heif"
              multiple
              maxCount={8}
              fileList={photos}
              beforeUpload={() => false}
              onChange={({ fileList }) => setPhotos(fileList)}
            >
              <Button type="button" size="sm" leadingIcon="upload">
                Attach photos
              </Button>
            </Upload>
          </Col>
        </Row>
        {error && (
          <Callout tone="bad" title="Not sent">
            {error}
          </Callout>
        )}
        <Flex wrap justify="end" gap={8}>
          <Button
            variant="ghost"
            disabled={raise.isPending}
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="danger" disabled={!ready || raise.isPending} onClick={send}>
            {raise.isPending ? 'Sending…' : 'Send emergency report'}
          </Button>
        </Flex>
      </Flex>
    </Panel>
  );
}
