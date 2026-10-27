import { describe, expect, it } from 'bun:test';

import { conditionLog, passStub, routeStops, stageRows, tripHistory, whereNow } from './tracking';

import type { TransportRequest, TripRecord, TripStop, TripView } from '@/interfaces';

const stop = (id: string, kind: string, name: string, latest?: string, at?: string): TripStop => ({
  id,
  sequence: 0,
  kind: kind as TripStop['kind'],
  jobCode: null,
  name,
  plannedAt: '2026-10-18T02:30:00Z',
  plannedStayMin: null,
  details: null,
  latestStatus: (latest ?? null) as TripStop['latestStatus'],
  latestOccurredAt: at ?? null,
  latestNote: null,
  latestRecordedBy: null,
});

const record = (kind: string, at: string, extra: Partial<TripRecord> = {}): TripRecord =>
  ({
    id: `${kind}-${at}`,
    kind,
    occurredAt: at,
    routeStopId: null,
    checkpointName: null,
    recordedBy: 'Minh',
    text: null,
    conditions: [],
    ...extra,
  }) as TripRecord;

const trip = (over: Partial<TripView>): TripView =>
  ({
    jobCode: 'CBRT-2026-041',
    tripCode: null,
    tripStatus: 'DEPARTED',
    clearanceReady: true,
    plannedDepartureAt: '2026-10-17T23:00:00Z',
    plannedArrivalAt: '2026-10-18T05:30:00Z',
    arrivalWindowStart: '2026-10-18T04:00:00Z',
    arrivalWindowEnd: '2026-10-18T07:00:00Z',
    stops: [],
    records: [],
    parts: [],
    flights: [],
    horses: [],
    handover: null,
    ...over,
  }) as TripView;

const NOW = '2026-10-18T01:41:00Z';

describe('tracking', () => {
  const onRoad = trip({
    stops: [
      stop('a', 'PICKUP', 'Phú Thọ', 'DEPARTED', '2026-10-17T23:05:00Z'),
      stop('b', 'BORDER', 'Mộc Bài – Bavet', 'CLEARED_BORDER', '2026-10-18T01:34:00Z'),
      stop('c', 'WELFARE', 'Svay Rieng'),
      stop('d', 'DELIVERY', 'Phnom Penh'),
    ],
    records: [
      record('DEPARTED', '2026-10-17T23:05:00Z', { checkpointName: 'Phú Thọ' }),
      record('CLEARED_BORDER', '2026-10-18T01:34:00Z', { checkpointName: 'Mộc Bài – Bavet' }),
      record('CONDITION_CHECK', '2026-10-18T01:40:00Z', {
        text: 'All settled.',
        recordedBy: 'Hoa',
      }),
    ],
  });

  it('puts the horses at the last recorded stop and the next one current', () => {
    expect(routeStops(onRoad).map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming']);
    expect(routeStops(onRoad)[1].time).toBe('08:34 · cleared');
    expect(routeStops(onRoad)[2].time).toBe('exp. 09:30');
  });

  it('leads with the last confirmed checkpoint and the next one', () => {
    const { body, next } = whereNow(onRoad);
    expect(body).toBe(
      'Your horses cleared the Mộc Bài – Bavet border at 08:34. Next checkpoint: Svay Rieng.',
    );
    expect(next?.name).toBe('Svay Rieng');
  });

  it('says when the horses arrive, in the window', () => {
    expect(passStub(onRoad, NOW)).toEqual({
      label: 'Arrives in about',
      value: '4 h',
      sub: '12:30 · in your window',
    });
  });

  it('folds the stages behind the trip into one row', () => {
    const rows = stageRows(onRoad, NOW);
    expect(rows.map((r) => [r.title, r.state])).toEqual([
      ['Request, Quotation, Approval, Documents and Clearance', 'done'],
      ['Trip', 'current'],
      ['Handover', 'upcoming'],
    ]);
  });

  it('keeps the grooms’ words in the condition log, newest first', () => {
    expect(conditionLog(onRoad)).toEqual([
      {
        id: 'CONDITION_CHECK-2026-10-18T01:40:00Z',
        at: '2026-10-18T01:40:00Z',
        by: 'Hoa',
        text: 'All settled.',
        photos: [],
      },
    ]);
  });

  it('carries the photos on a record into the history, with the horse each shows', () => {
    const photo = {
      id: 'p1',
      fileName: 'king.jpg',
      contentType: 'image/jpeg',
      contentUrl: '/f/p1',
    };
    const t = trip({
      records: [
        record('CONDITION_CHECK', '2026-10-18T01:40:00Z', {
          conditions: [
            {
              horseId: 'h',
              horseName: 'Copper King',
              condition: 'SOUND',
              drinking: true,
              eating: true,
              note: null,
              photos: [photo],
            },
          ],
        }),
      ],
    });
    expect(tripHistory(t, { history: [] } as unknown as TransportRequest)[0].photos).toEqual([
      { ...photo, horseName: 'Copper King' },
    ]);
  });

  it('says a delivery at a transfer handed the horses on', () => {
    const t = trip({
      stops: [stop('x', 'TRANSFER', 'TCS cargo terminal', 'DELIVERED', '2026-10-18T01:00:00Z')],
      records: [
        record('DELIVERED', '2026-10-18T01:00:00Z', {
          routeStopId: 'x',
          checkpointName: 'TCS cargo terminal',
        }),
      ],
    });
    expect(tripHistory(t, { history: [] } as unknown as TransportRequest)[0].summary).toBe(
      'Handed on to the next trip at TCS cargo terminal.',
    );
    expect(routeStops(t)[0].time).toBe('08:00 · handed on');
  });

  it('says when the horses were delivered, inside the window', () => {
    const t = trip({
      tripStatus: 'DELIVERED',
      handover: { deliveredAt: '2026-10-18T05:41:00Z' } as TripView['handover'],
    });
    expect(passStub(t, NOW)).toEqual({
      label: 'Delivered',
      value: '12:41',
      sub: '18 Oct · inside your window',
    });
  });
});
