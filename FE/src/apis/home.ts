import type { CustomerHome } from '@/interfaces';

/*
 * DEMO DATA. The backend has the domain model but no Home endpoint yet, so this returns the
 * Figma demo (docs/figma-plugin/src/03-pages.js, scrHome / scrHomeClear / scrHomeRoad) for
 * Saigon Turf Club. When GET /customer/home exists, replace the body of getCustomerHome with:
 *   apiV1Instance.get<CustomerHome>('/customer/home').then((r) => r.data)
 * `?demo=clear` and `?demo=road` show the other two Home states.
 */

const HORSES_OWING: CustomerHome['horses'] = [
  {
    id: 'h1',
    name: 'Shadowfax',
    coat: 'grey',
    line: 'Grey · Andalusian gelding',
    documents: '4 of 5 cleared',
  },
  {
    id: 'h2',
    name: 'Nightfall',
    coat: 'black',
    line: 'Black · Thoroughbred mare',
    documents: '3 of 5 cleared',
    note: { text: 'New EIA test due 4 Oct', tone: 'warn' },
  },
  {
    id: 'h3',
    name: 'Copper King',
    coat: 'chestnut',
    line: 'Chestnut · Quarter Horse stallion',
    documents: '4 of 5 cleared',
  },
  {
    id: 'h4',
    name: 'Silver Bell',
    coat: 'grey',
    line: 'Grey · Lipizzan mare',
    documents: '2 of 5 cleared',
    note: { text: 'Bill of sale overdue', tone: 'bad' },
  },
];

const OWING: CustomerHome = {
  asOf: '2026-09-26T11:20:00+07:00',
  clubName: 'Saigon Turf Club',
  requestCount: 3,
  horseCount: 4,
  nextDeparture: {
    route: 'Ho Chi Minh City → Phnom Penh',
    departsAt: '2026-10-18T06:00:00+07:00',
    state: 'locked',
  },
  owedRequestCount: 2,
  owed: [
    {
      id: 'o1',
      urgency: 'overdue',
      title: 'Upload a signed bill of sale',
      subject: 'CBRT-2026-041 · Silver Bell · Proof of ownership',
      reason:
        'Rejected 24 Sep by Lan, transport specialist: the bill of sale is unsigned. Upload a signed copy.',
      dueAt: '2026-09-25T17:00:00+07:00',
      action: { label: 'Upload signed copy', icon: 'upload' },
    },
    {
      id: 'o2',
      urgency: 'soon',
      title: 'Accept or decline quotation v2',
      subject: 'REQ-2026-0179 · Q-2026-0188 · $38,019.20',
      reason:
        'Phnom Penh → Hong Kong (Sha Tin) for Nightfall and Shadowfax. It holds its price until 30 Sep; after that Yến re-prices it.',
      dueAt: '2026-09-30T17:00:00+07:00',
      action: { label: 'Open quotation' },
    },
    {
      id: 'o3',
      urgency: 'soon',
      title: 'Extend transit insurance to 20 Oct',
      subject: 'CBRT-2026-041 · Shipment · PVI Insurance policy',
      reason:
        'The policy ends 15 Oct, before arrival plus 2 days (20 Oct). Upload the extended policy.',
      dueAt: '2026-09-30T17:00:00+07:00',
      action: { label: 'Upload extended policy', icon: 'upload' },
    },
    {
      id: 'o4',
      urgency: 'upcoming',
      title: 'Book a new EIA (Coggins) test',
      subject: 'CBRT-2026-041 · Nightfall · EIA (Coggins) test',
      reason:
        'Valid today, but 77 days old at departure; the limit is 60. The new test must be dated 19 Aug or later.',
      dueAt: '2026-10-04T17:00:00+07:00',
      action: { label: 'Upload test result', icon: 'upload' },
    },
    {
      id: 'o5',
      urgency: 'upcoming',
      title: 'Upload a new influenza booster record',
      subject: 'CBRT-2026-041 · Silver Bell · Influenza vaccination',
      reason:
        'The booster lapsed on 16 Sep. Give a new booster at least 7 days before departure and upload the record.',
      dueAt: '2026-10-11T17:00:00+07:00',
      action: { label: 'Upload booster record', icon: 'upload' },
    },
  ],
  moves: [
    {
      requestCode: 'REQ-2026-0162',
      route: 'Ho Chi Minh City → Phnom Penh',
      detail: 'job CBRT-2026-041 · 4 horses · road, private trailer',
      stage: 'Documents',
      holds: { text: 'Departure locked · you owe 4', tone: 'bad' },
      departsAt: '2026-10-18T06:00:00+07:00',
    },
    {
      requestCode: 'REQ-2026-0179',
      route: 'Phnom Penh → Hong Kong (Sha Tin)',
      detail: 'quotation Q-2026-0188 · 2 horses · air, business class',
      stage: 'Quotation',
      holds: { text: 'Quotation waiting for you', tone: 'warn' },
      departsAt: '2026-11-20T06:00:00+07:00',
    },
    {
      requestCode: 'REQ-2026-0193',
      route: 'Ho Chi Minh City → Bangkok',
      detail: '2 horses · road, shared load',
      stage: 'Request',
      holds: { text: 'In review with Yến; nothing needed', tone: 'neutral' },
      departsAt: '2026-10-30T06:00:00+07:00',
    },
  ],
  horses: HORSES_OWING,
  horsesNote: 'Documents cleared for the 18 Oct move, CBRT-2026-041.',
};

const LATER_MOVES = (stage193: 'Quotation'): CustomerHome['moves'] => [
  {
    requestCode: 'REQ-2026-0193',
    route: 'Phnom Penh → Bangkok',
    detail: '2 horses · road, shared load · pickup moved to Phnom Penh',
    stage: stage193,
    holds: { text: 'Yến is pricing version 2; nothing needed', tone: 'neutral' },
    departsAt: '2026-10-30T06:00:00+07:00',
  },
  {
    requestCode: 'REQ-2026-0179',
    route: 'Phnom Penh → Hong Kong (Sha Tin)',
    detail: 'quotation Q-2026-0188 accepted · 2 horses · air, business class',
    stage: 'Approval',
    holds: { text: 'With Yến for approval; nothing needed', tone: 'neutral' },
    departsAt: '2026-11-20T06:00:00+07:00',
  },
];

const CLEAR: CustomerHome = {
  ...OWING,
  asOf: '2026-10-15T09:00:00+07:00',
  nextDeparture: {
    route: 'Ho Chi Minh City → Phnom Penh',
    departsAt: '2026-10-18T06:00:00+07:00',
    state: 'cleared',
  },
  owed: [],
  owedRequestCount: 0,
  nextEvent: {
    title: 'Nothing needed from you',
    body: 'All 23 documents for CBRT-2026-041 cleared on 14 Oct. Minh, driver, collects all four horses at Phú Thọ training centre.',
    verb: 'Departs',
    at: '2026-10-18T06:00:00+07:00',
    dateStyle: 'dayTime',
  },
  moves: [
    {
      requestCode: 'REQ-2026-0162',
      route: 'Ho Chi Minh City → Phnom Penh',
      detail: 'job CBRT-2026-041 · 4 horses · road, private trailer',
      stage: 'Clearance',
      holds: { text: 'Cleared to depart', tone: 'ok' },
      departsAt: '2026-10-18T06:00:00+07:00',
    },
    ...LATER_MOVES('Quotation'),
  ],
  horses: HORSES_OWING.map((h) => ({ ...h, documents: '5 of 5 cleared', note: undefined })),
};

const ROAD: CustomerHome = {
  ...CLEAR,
  asOf: '2026-10-18T08:41:00+07:00',
  nextDeparture: {
    route: 'Ho Chi Minh City → Phnom Penh',
    departsAt: '2026-10-18T06:05:00+07:00',
    state: 'on-road',
    arrivesAt: '2026-10-18T12:30:00+07:00',
  },
  nextEvent: {
    title: 'Nothing needed from you',
    body: 'Your horses cleared the Mộc Bài – Bavet border at 08:34. Next checkpoint: the Svay Rieng welfare stop.',
    verb: 'Expected',
    at: '2026-10-18T09:30:00+07:00',
    dateStyle: 'time',
  },
  trip: {
    updatedAt: '2026-10-18T08:41:00+07:00',
    gate: 'clear',
    stops: [
      { name: 'Ho Chi Minh City', kind: 'Pickup', state: 'done', time: '06:05 · departed' },
      { name: 'Mộc Bài – Bavet', kind: 'Border', state: 'current', time: '08:34 · cleared' },
      { name: 'Svay Rieng', kind: 'Welfare stop', state: 'upcoming', time: 'exp. 09:30' },
      { name: 'Phnom Penh', kind: 'Delivery', state: 'upcoming', time: 'exp. 12:30' },
    ],
  },
  moves: [
    {
      requestCode: 'REQ-2026-0162',
      route: 'Ho Chi Minh City → Phnom Penh',
      detail: 'job CBRT-2026-041 · 4 horses · road, private trailer',
      stage: 'Trip',
      holds: { text: 'On the road since 06:05', tone: 'info' },
      departsAt: '2026-10-18T06:05:00+07:00',
      arrivesAt: '2026-10-18T12:30:00+07:00',
    },
    ...LATER_MOVES('Quotation'),
  ],
  horses: [
    {
      id: 'h1',
      name: 'Shadowfax',
      coat: 'grey',
      line: 'Grey · Andalusian gelding',
      documents: 'Stall 1 · standard',
      note: { text: 'Sound at 08:40', tone: 'ok' },
    },
    {
      id: 'h2',
      name: 'Nightfall',
      coat: 'black',
      line: 'Black · Thoroughbred mare',
      documents: 'Stall 4 · climate',
      note: { text: 'Calm again at 08:40', tone: 'ok' },
    },
    {
      id: 'h3',
      name: 'Copper King',
      coat: 'chestnut',
      line: 'Chestnut · Quarter Horse stallion',
      documents: 'Stall 2 · box',
      note: { text: 'Sound at 08:40', tone: 'ok' },
    },
    {
      id: 'h4',
      name: 'Silver Bell',
      coat: 'grey',
      line: 'Grey · Lipizzan mare',
      documents: 'Stall 6 · standard',
      note: { text: 'Sound at 08:40', tone: 'ok' },
    },
  ],
  horsesNote: 'All four on CBRT-2026-041, with Hoa’s last condition log.',
};

export type HomeDemoState = 'owing' | 'clear' | 'road';

const DEMO: Record<HomeDemoState, CustomerHome> = { owing: OWING, clear: CLEAR, road: ROAD };

export const homeApi = {
  getCustomerHome: async (demo: HomeDemoState = 'owing'): Promise<CustomerHome> => DEMO[demo],
};
