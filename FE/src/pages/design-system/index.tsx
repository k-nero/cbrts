import { FC, useState } from 'react';

import { Col, Flex, Row as GridRow } from 'antd';

import { QuoteLineDemo } from './QuoteLineDemo';
import { Row } from './Row';
import { Section } from './Section';

import Brand from '@/components/Brand';
import Footer from '@/components/Footer';
import PageHeader from '@/components/PageHeader';
import signInPhoto from '@/assets/photos/draft-signin-grey-window.jpg';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Button,
  type ButtonVariant,
  Callout,
  Checkbox,
  Chip,
  ClearanceGate,
  Deadline,
  DocumentRow,
  DraftPass,
  EstimateCard,
  FactCell,
  HorseCard,
  Icon,
  IconButton,
  ICON_NAMES,
  LoadItem,
  Nameplate,
  NotificationItem,
  OptionCard,
  OwedItem,
  Panel,
  Perforation,
  PhotoPanel,
  Progress,
  Radio,
  StageMark,
  StallTile,
  StatTile,
  Steps,
  Tabs,
  TimelineStop,
  Toast,
  type Tone,
} from '@/components/ui';

const TONES: Tone[] = ['neutral', 'ok', 'warn', 'bad', 'info'];

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];

/**
 * Every component of the library in its variants, on the active theme (the toggle flips it).
 * The reference for building pages; mirrors the Figma ◆ Components page.
 */
const DesignSystemPage: FC = () => {
  const [mode, setMode] = useState('road');
  const [horses, setHorses] = useState<string[]>(['nightfall']);
  const [tab, setTab] = useState<'all' | 'you' | 'authority' | 'cleared'>('all');
  const [picked, setPicked] = useState(false);
  const toggleHorse = (h: string) =>
    setHorses((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h]));

  return (
    <div className="min-h-screen bg-canvas">
      <header className="h-16 border-b border-line px-10">
        <Flex align="center" justify="space-between" className="h-full">
          <Brand />
          <ThemeToggle />
        </Flex>
      </header>
      <main className="mx-auto max-w-300 px-0 pt-8 pb-24">
        <Flex vertical gap={32}>
          <PageHeader
            title="Design system"
            summary="The EquiFreight components as built in the app, in both themes. Gold marks the one action that moves a job forward; status is always a tone plus a word."
            right={<Chip tone="info">Reference</Chip>}
          />

          <Section
            title="Icons"
            description={`${ICON_NAMES.length} line icons on a 24 px grid, 1.75 stroke, round caps. They take the colour of the text around them.`}
          >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3">
              {ICON_NAMES.map((n) => (
                <div
                  key={n}
                  className="rounded-md border border-line bg-card px-2 pt-4 pb-3 text-ink"
                >
                  <Flex vertical align="center" gap={10}>
                    <Icon name={n} />
                    <span className="type-caption text-ink-3">{n}</span>
                  </Flex>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Button"
            description="Primary is the single forward action on a view. Secondary for alternatives, Ghost for inline and back links, Danger outlined so it can never read as primary. Disabled stays visible at 45%."
          >
            {(['md', 'sm'] as const).map((size) => (
              <Row key={size} label={size === 'md' ? 'MD · 40 px' : 'SM · 32 px'}>
                {VARIANTS.map((v) => (
                  <Button
                    key={v}
                    variant={v}
                    size={size}
                    leadingIcon={v === 'primary' ? 'upload' : undefined}
                  >
                    {v === 'primary'
                      ? 'Upload signed copy'
                      : v === 'danger'
                        ? 'Revoke invite'
                        : v === 'ghost'
                          ? 'Show all'
                          : 'Request transport'}
                  </Button>
                ))}
                <Button size={size} disabled>
                  Issue quotation
                </Button>
                <Button size={size} variant="ghost" leadingIcon="arrow-left">
                  Back
                </Button>
                <Button size={size} trailingIcon="arrow-right">
                  Open route plan
                </Button>
              </Row>
            ))}
          </Section>

          <Section
            title="Chip"
            description="Ok = cleared, Warn = expires in transit or due soon, Bad = fails its rule, Info = in review or current, Neutral = required or informational. There is no gold chip."
          >
            <Row>
              <Chip tone="ok">Cleared</Chip>
              <Chip tone="warn">Expires in transit</Chip>
              <Chip tone="bad">Departure locked</Chip>
              <Chip tone="info">In review</Chip>
              <Chip tone="neutral">Required</Chip>
              <Chip tone="neutral" dot={false}>
                Fixed
              </Chip>
            </Row>
            <Row label="Stage mark: a position, so words, not a chip">
              <StageMark stage="Documents" />
              <StageMark stage="Handover" />
            </Row>
          </Section>

          <Section
            title="Checkbox, radio and option card"
            description="A checked box or chosen radio is a strong neutral, never gold. Option cards carry their effect on the estimate in the meta line; a disabled card says why."
          >
            <Row>
              <Checkbox label="My dates can move by ±3 days" defaultChecked />
              <Checkbox label="Unchecked" />
              <Checkbox label="Disabled" disabled />
              <Radio name="demo-radio" label="Any time on the day" defaultChecked />
              <Radio name="demo-radio" label="Within a window" />
            </Row>
            <GridRow gutter={[16, 16]}>
              <Col span={8} className="flex *:min-w-0 *:flex-1">
                <OptionCard
                  name="mode"
                  value="road"
                  selected={mode === 'road'}
                  onChange={() => setMode('road')}
                  icon="truck"
                  title="Road"
                  description="Door to door by horse trailer, across land borders."
                  meta="In the estimate"
                />
              </Col>
              <Col span={8} className="flex *:min-w-0 *:flex-1">
                <OptionCard
                  name="mode"
                  value="air"
                  selected={mode === 'air'}
                  onChange={() => setMode('air')}
                  icon="plane"
                  title="Air"
                  description="Road to the airport, then a stall on a freighter."
                  meta={<span className="type-data">+ $2,400 – $3,300</span>}
                />
              </Col>
              <Col span={8} className="flex *:min-w-0 *:flex-1">
                <OptionCard
                  name="mode"
                  value="sea"
                  selected={false}
                  disabled
                  icon="route"
                  title="Shared trailer"
                  description="Shares the trailer with another club's horses."
                  meta="Not on this route. The nearest is a private trailer."
                />
              </Col>
            </GridRow>
            <GridRow gutter={[16, 16]}>
              {[
                ['nightfall', 'Nightfall', 'Thoroughbred · Mare · 7 y', 'bg-coat-black'],
                ['shadowfax', 'Shadowfax', 'Andalusian · Gelding · 9 y', 'bg-coat-grey'],
              ].map(([k, t, d, coat]) => (
                <Col key={k} span={8} className="flex *:min-w-0 *:flex-1">
                  <OptionCard
                    type="checkbox"
                    selected={horses.includes(k)}
                    onChange={() => toggleHorse(k)}
                    media={<span aria-hidden className={`size-12 rounded-full ${coat}`} />}
                    title={t}
                    description={d}
                    meta={<span className="type-caption">M · 32 in · 510 kg</span>}
                  >
                    <Flex component="span" wrap gap={8}>
                      <Chip tone="ok">Calm</Chip>
                    </Flex>
                  </OptionCard>
                </Col>
              ))}
            </GridRow>
          </Section>

          <Section
            title="Navigation"
            description="Tabs for in-page views (Label M, 2 px gold underline, counts inline) and the request wizard's steps (current gold, done green)."
          >
            <Tabs
              label="Documents"
              activeKey={tab}
              onChange={setTab}
              items={[
                { key: 'all', label: 'All', count: 23 },
                { key: 'you', label: 'With you', count: 4 },
                { key: 'authority', label: 'With the authorities', count: 3 },
                { key: 'cleared', label: 'Cleared', count: 16 },
              ]}
              extra="Owner Lan, transport specialist"
            />
            <Steps steps={['Horses', 'Service', 'Route & dates', 'Review']} current={2} />
          </Section>

          <Section
            title="Shell tools and notifications"
            description="The 36 px tools in the shell's corner: the theme toggle and the bell. The bell's count is a strong neutral pill, hidden at 0 and 99+ above 99, and its accessible name says what it counts. A notification links to its record: unread on the raised surface with a dot, its kind as a chip so the state is said in words."
          >
            <Row label="Bell: none, 3 and 120 unread">
              <IconButton icon="bell" label="Notifications" />
              <IconButton icon="bell" label="Notifications, 3 unread" count={3} />
              <IconButton icon="bell" label="Notifications, 120 unread" count={120} />
              <IconButton icon="moon" label="Switch to dark theme" />
            </Row>
            <div className="w-100 divide-y divide-line rounded-lg border border-line bg-card">
              <NotificationItem
                title="REQ-2026-0031 needs your answer"
                body="Shadowfax and Nightfall will be in Phnom Penh from 18 Oct. Should we collect them there?"
                kindLabel="Answer needed"
                tone="warn"
                code="REQ-2026-0031"
                when="12 min ago"
                whenExact="23 Oct, 14:02"
                unread
                to="/design-system"
              />
              <NotificationItem
                title="Trip CBRT-2026-041 held at Mộc Bài – Bavet"
                body="Vet check at the border."
                kindLabel="Trip held"
                tone="bad"
                code="CBRT-2026-041"
                when="2 days ago"
                whenExact="21 Oct, 09:40"
                unread={false}
                to="/design-system"
              />
            </div>
          </Section>

          <Section
            title="Feedback and data"
            description="Stat tiles only where the counts are the point of the view. Progress for readiness and payload, always with the figure beside it. Callouts name the rule, the value found and the fix."
          >
            <Row>
              <StatTile
                value="4"
                label="Awaiting review"
                lead="REQ-2026-0193 waits 2 days"
                onClick={() => undefined}
              />
              <StatTile tone="ok" value="16" label="Documents cleared" />
              <StatTile tone="warn" value="2" label="Due today" />
              <StatTile tone="bad" value="1" label="Overdue" />
              <StatTile tone="info" value="3" label="In transit" />
            </Row>
            <GridRow gutter={[24, 24]}>
              {(['neutral', 'ok', 'warn', 'bad'] as const).map((t, i) => (
                <Col key={t} span={6}>
                  <Flex vertical gap={8}>
                    <span className="type-caption text-ink-3">
                      {[60, 100, 80, 30][i]}% · {t}
                    </span>
                    <Progress tone={t} value={[60, 100, 80, 30][i]} label={`${t} progress`} />
                  </Flex>
                </Col>
              ))}
            </GridRow>
            <GridRow gutter={[16, 16]}>
              <Col span={12} className="flex *:min-w-0 *:flex-1">
                <Callout tone="info" title="If we arrive after 12:00, we pay">
                  10% of the job total per started hour, up to 30%. The clock stops while the
                  authorities hold the horses.
                </Callout>
              </Col>
              <Col span={12} className="flex *:min-w-0 *:flex-1">
                <Callout tone="ok" title="Passes">
                  Sampled on 2 Sep 2026: 45 days before departure. The limit is 60.
                </Callout>
              </Col>
              <Col span={12} className="flex *:min-w-0 *:flex-1">
                <Callout tone="warn" title="Expires in transit">
                  Valid today, but 77 days old at departure. Upload a test sampled on 19 Aug or
                  later.
                </Callout>
              </Col>
              <Col span={12} className="flex *:min-w-0 *:flex-1">
                <Callout
                  tone="bad"
                  title="Not sent"
                  action={
                    <>
                      <Button size="sm" variant="primary">
                        Try again
                      </Button>
                      <Button size="sm" variant="ghost">
                        Keep for later
                      </Button>
                    </>
                  }
                >
                  Nothing was recorded and the customer wasn't told.
                </Callout>
              </Col>
            </GridRow>
            <Row>
              <Toast>Quotation Q-2026-0188 issued to Saigon Turf Club.</Toast>
              <Toast tone="bad">Couldn't save. Check your connection and try again.</Toast>
            </Row>
          </Section>

          <Section
            title="Owed item and deadline"
            description="What the customer owes, soonest first; only the top item's action is gold. Every deadline is said twice: time left, then the date."
          >
            <Panel title={<h2 className="type-h3 m-0 text-ink">You owe 3 items</h2>} flush>
              <OwedItem
                urgency="overdue"
                icon="file"
                title="Upload the EIA test"
                subject="Nightfall · REQ-2026-0193"
                reason="Cambodia needs a test sampled within 60 days of departure."
                deadline={{ left: 'Overdue by 1 day', date: '30 Sep 2026' }}
                action={
                  <Button size="sm" variant="primary" leadingIcon="upload">
                    Upload
                  </Button>
                }
              />
              <OwedItem
                urgency="soon"
                icon="shield"
                title="Sign the transit insurance"
                subject="REQ-2026-0193"
                reason="Asked by Lan: the policy must name both horses."
                deadline={{ left: 'Due in 2 days', date: '5 Oct 2026' }}
                action={<Button size="sm">Open</Button>}
              />
              <OwedItem
                urgency="upcoming"
                icon="calendar"
                title="Confirm the pickup time"
                subject="REQ-2026-0201"
                deadline={{ left: 'Due in 9 days', date: '12 Oct 2026' }}
                action={<Button size="sm">Open</Button>}
              />
            </Panel>
            <Row>
              <Deadline left="Overdue by 1 day" date="30 Sep 2026" tone="bad" />
              <Deadline left="Due in 4 days" date="7 Oct 2026" tone="warn" />
              <Deadline left="Done" date="2 Oct 2026" tone="ok" />
            </Row>
          </Section>

          <Section
            title="Horse card and nameplate"
            description="A horse's identity is an engraved brass plate on its coat colour; no photography. Facts are mono, labels sentence case."
          >
            <Row>
              <Nameplate name="Shadowfax" subtitle="Andalusian · Gelding" />
            </Row>
            <GridRow gutter={[24, 24]}>
              <Col span={8} className="flex *:min-w-0 *:flex-1">
                <HorseCard
                  coat="chestnut"
                  name="Nightfall"
                  subtitle="Thoroughbred · Mare"
                  tags={
                    <>
                      <Chip tone="ok">Calm</Chip>
                      <Chip tone="info">Climate stall</Chip>
                    </>
                  }
                  facts={{ age: '7 y', height: '16.2 hh', weight: '510 kg', size: 'M · 32' }}
                  microchip="250 259 600 123 456"
                  declaredValue="$120,000"
                  notes="Annual vaccinations up to date. Loads best in a quiet yard."
                  readiness={{ label: 'Documents · CBRT-2026-041', cleared: 3, total: 5 }}
                  actions={
                    <>
                      <Button size="sm" leadingIcon="pencil">
                        Edit profile
                      </Button>
                      <Button size="sm" variant="danger">
                        Remove
                      </Button>
                    </>
                  }
                />
              </Col>
              <Col span={8} className="flex *:min-w-0 *:flex-1">
                <HorseCard
                  coat="grey"
                  name="Shadowfax"
                  subtitle="Andalusian · Gelding"
                  tags={<Chip tone="warn">Nervous</Chip>}
                  facts={{ age: '9 y', height: '15.3 hh', weight: '480 kg', size: 'M · 32' }}
                  microchip="250 259 600 654 321"
                  declaredValue="$85,000"
                />
              </Col>
              <Col span={8} className="flex *:min-w-0 *:flex-1">
                <HorseCard
                  coat="bay"
                  name="Copper King"
                  subtitle="Thoroughbred · Stallion"
                  tags={<Chip tone="bad">Needs a box</Chip>}
                  facts={{ age: '5 y', height: '16.3 hh', weight: '545 kg', size: 'L · 48' }}
                />
              </Col>
              <Col span={8} className="flex *:min-w-0 *:flex-1">
                <HorseCard
                  coat="other"
                  name="Silver Bell"
                  subtitle="Lipizzan · Mare"
                  status={<Chip tone="neutral">Archived · 3 Oct 2026</Chip>}
                  tags={<Chip tone="ok">Calm</Chip>}
                  facts={{ age: '6 y', height: '15.1 hh', weight: '445 kg', size: 'M · 32' }}
                />
              </Col>
            </GridRow>
          </Section>

          <Section
            title="Load plan"
            description="Stall type is a colour and a label; dashed means a place something can go; a conflict names its rule in words. Select a horse, then a stall."
          >
            <div className="grid grid-cols-[300px_1fr] gap-6">
              <Flex vertical gap={12}>
                <LoadItem
                  horse="Silver Bell"
                  meta="Mare · 445 kg · Lipizzan"
                  tag={<Chip tone="ok">Calm</Chip>}
                  selected={picked}
                  onClick={() => setPicked((p) => !p)}
                />
                <LoadItem
                  horse="Copper King"
                  meta="Stallion · 545 kg · Thoroughbred"
                  tag={<Chip tone="bad">Aggressive</Chip>}
                />
              </Flex>
              <GridRow gutter={[12, 12]}>
                <Col span={8} className="flex *:min-w-0 *:flex-1">
                  <StallTile
                    type="standard"
                    state="occupied"
                    stall="Stall 1"
                    horse="Shadowfax"
                    meta="Gelding · 480 kg · Nervous"
                  />
                </Col>
                <Col span={8} className="flex *:min-w-0 *:flex-1">
                  <StallTile
                    type="standard"
                    state={picked ? 'target' : 'empty'}
                    stall="Stall 2"
                    targetHint="Place Silver Bell here"
                    onClick={picked ? () => setPicked(false) : undefined}
                  />
                </Col>
                <Col span={8} className="flex *:min-w-0 *:flex-1">
                  <StallTile type="box" state="empty" stall="Stall 3" />
                </Col>
                <Col span={8} className="flex *:min-w-0 *:flex-1">
                  <StallTile
                    type="standard"
                    state="conflict"
                    stall="Stall 4"
                    horse="Copper King"
                    meta="Stallion · 545 kg · Aggressive"
                    issue="Needs a box stall (stallion or aggressive horse); Stallion stands beside a mare"
                  />
                </Col>
                <Col span={8} className="flex *:min-w-0 *:flex-1">
                  <StallTile
                    type="climate"
                    state="occupied"
                    stall="Stall 5"
                    horse="Nightfall"
                    meta="Mare · 510 kg · Calm"
                  />
                </Col>
                <Col span={8} className="flex *:min-w-0 *:flex-1">
                  <StallTile type="climate" state="empty" stall="Stall 6" />
                </Col>
              </GridRow>
            </div>
          </Section>

          <Section
            title="Documents and the clearance gate"
            description="Each row's rule is checked against the travel dates, never today. The gate opens only when every mandatory item is GREEN and approved, and quarantine is complete."
          >
            <ClearanceGate
              state="locked"
              action={<Button trailingIcon="arrow-right">View outstanding items</Button>}
            >
              9 items must clear before departure can be recorded.
            </ClearanceGate>
            <ClearanceGate
              state="clear"
              action={<Button trailingIcon="arrow-right">Open route plan</Button>}
            >
              Every mandatory document is cleared and quarantine is complete.
            </ClearanceGate>
            <div className="overflow-hidden rounded-lg border border-line">
              <DocumentRow
                status="cleared"
                document="Equine passport"
                rule="Valid through arrival + 2 days"
                result="Valid until 14 Mar 2029."
                version="v1 · 2 Sep 2026"
                actions={
                  <Button size="sm" variant="ghost" leadingIcon="history">
                    History
                  </Button>
                }
              />
              <DocumentRow
                status="review"
                document="Influenza vaccination"
                rule="Booster 7 to 180 days before departure"
                result="Booster on 12 Jul 2026: 98 days before departure."
                version="v2 · 28 Sep 2026"
                actions={
                  <>
                    <Button size="sm" variant="ghost">
                      Reject
                    </Button>
                    <Button size="sm" leadingIcon="check">
                      Approve
                    </Button>
                  </>
                }
              />
              <DocumentRow
                status="amber"
                document="EIA test"
                rule="Sampled within 60 days of departure"
                result="77 days old at departure. Upload a test sampled on 19 Aug or later."
                version="v1 · 9 Aug 2026"
                actions={
                  <Button size="sm" leadingIcon="upload">
                    Request new version
                  </Button>
                }
              />
              <DocumentRow
                status="red"
                document="Proof of ownership"
                rule="Names the club as owner"
                result="Names a previous owner."
                version="v1 · 20 Sep 2026"
                actions={
                  <Button size="sm" leadingIcon="upload">
                    Request new version
                  </Button>
                }
              />
              <DocumentRow
                status="required"
                document="Import permit"
                rule="Issued by Cambodia's GDAHP"
                result="Not uploaded yet."
                actions={
                  <Button size="sm" leadingIcon="bell">
                    Send reminder
                  </Button>
                }
              />
            </div>
          </Section>

          <Section
            title="Draft pass"
            description="The request drawn as the pass it becomes once approved. It fills in as the wizard's steps are done; a value no step has set says which step sets it, and the stub never shows a single price."
          >
            <GridRow gutter={[24, 24]} align="top">
              <Col span={8}>
                <DraftPass
                  from={null}
                  to={null}
                  rows={[
                    { label: 'Departs', value: null, step: 2 },
                    { label: 'Arrival', value: null, step: 2 },
                    { label: 'Borders', value: null, step: 2 },
                    { label: 'Service', value: null, step: 3 },
                  ]}
                  rangeSub="Not a quote. A logistics manager prices the move after review; the quotation is itemised and valid for 7 days."
                />
              </Col>
              <Col span={8}>
                <DraftPass
                  from="Bangkok"
                  to="Singapore"
                  rows={[
                    { label: 'Departs', value: null, step: 2 },
                    { label: 'Arrival', value: null, step: 2 },
                    { label: 'Borders', value: 'Not run yet', tone: 'warn' },
                    { label: 'Service', value: null, step: 3 },
                  ]}
                  rangeSub="No range: we don't run Bangkok → Singapore yet."
                />
              </Col>
              <Col span={8}>
                <DraftPass
                  chip={{ tone: 'neutral', label: 'Submitted' }}
                  from="Ho Chi Minh City"
                  to="Bangkok"
                  rows={[
                    { label: 'Departs', value: '30 Oct 2026 · ±3 d', mono: true },
                    { label: 'Arrival', value: 'Any time on the day' },
                    { label: 'Borders', value: '2 · Mộc Bài, Poipet' },
                    { label: 'Service', value: 'Road · shared load' },
                  ]}
                  rangeSub="Not a quote. A logistics manager prices the move after review; the quotation is itemised and valid for 7 days."
                />
              </Col>
            </GridRow>
          </Section>

          <Section
            title="Quotation"
            description="The estimate is always a range and never a quote. Quote lines show their basis; estimated lines say why they may vary; an override keeps the catalog value struck through."
          >
            <div className="grid grid-cols-[1fr_400px] gap-6">
              <div className="overflow-hidden rounded-lg border border-line">
                <QuoteLineDemo />
              </div>
              <EstimateCard
                range="$11,300 – $16,100"
                drivers={[
                  { label: 'Horses', value: '2' },
                  { label: 'Grooms', value: '1 per 3 horses → 1' },
                  { label: 'Border crossings', value: '2' },
                  { label: 'Distance', value: '~960 km' },
                ]}
              />
            </div>
          </Section>

          <Section
            title="Route"
            description="Stops on the route plan and the journey log. The icon names the kind of stop; state is a chip."
          >
            <Flex vertical gap={12}>
              <TimelineStop
                kind="pickup"
                stop="Saigon Turf Club stables"
                time="06:00"
                details="Load 2 horses. Grooms Tùng and Vy."
                status={<Chip tone="ok">Departed</Chip>}
              />
              <TimelineStop
                kind="border"
                stop="Mộc Bài – Bavet"
                time="09:40"
                details="Vietnam export and Cambodia entry."
                status={<Chip tone="info">Next</Chip>}
              />
              <TimelineStop
                kind="welfare"
                stop="Svay Rieng rest yard"
                time="11:30"
                details="45 min. Water, hay, condition check."
              />
              <TimelineStop
                kind="delivery"
                stop="Phnom Penh Royal Turf"
                time="14:10"
                details="Receiver: Sophea, receiving groom."
              />
            </Flex>
          </Section>

          <Section
            title="Panels and facts"
            description="Flat bordered panels, 12 px corners, no shadow; facts on Deep Well cells."
          >
            <GridRow gutter={[24, 24]}>
              <Col span={12} className="flex *:min-w-0 *:flex-1">
                <Panel
                  title="Vehicle and crew"
                  extra={<Chip tone="ok">Confirmed</Chip>}
                  footer={
                    <span className="type-body-s text-ink-3">Confirmed by Khôi, 2 Oct 2026</span>
                  }
                >
                  <GridRow gutter={[4, 4]}>
                    <Col span={8} className="flex *:min-w-0 *:flex-1">
                      <FactCell label="Vehicle" value="TX-447" />
                    </Col>
                    <Col span={8} className="flex *:min-w-0 *:flex-1">
                      <FactCell label="Payload" value="2,180 kg" />
                    </Col>
                    <Col span={8} className="flex *:min-w-0 *:flex-1">
                      <FactCell label="Stalls" value="6" />
                    </Col>
                  </GridRow>
                </Panel>
              </Col>
              <Col span={12} className="flex *:min-w-0 *:flex-1">
                <Panel title="Fields">
                  <p className="type-body-s m-0 text-ink-2">
                    Form fields come from the form kit (components/form), themed to 44 px on Field
                    Navy with a gold focus border and ring.
                  </p>
                </Panel>
              </Col>
            </GridRow>
          </Section>

          <Section
            title="Pass and photograph"
            description="A pass tears between its body and stub on a line of 3 px Strong Border holes. A photograph is a material: its panel is Dark in both themes, with a navy scrim under its text."
          >
            <GridRow gutter={[24, 24]}>
              <Col span={12} className="flex *:min-w-0 *:flex-1">
                <Flex className="overflow-hidden rounded-lg border border-line bg-card">
                  <div className="flex-1 px-5 py-4">
                    <Flex vertical gap={4}>
                      <span className="type-h4 text-ink">Ho Chi Minh City → Phnom Penh</span>
                      <span className="type-caption text-ink-2">CBRT-2026-041</span>
                    </Flex>
                  </div>
                  <Perforation gap={6} inset={6} />
                  <div className="w-[160px] bg-sunken py-4 pr-4 pl-5">
                    <Flex vertical gap={2}>
                      <span className="type-label-m text-ink">In 5 days</span>
                      <span className="type-caption text-ink-3">18 Oct 2026</span>
                    </Flex>
                  </div>
                </Flex>
              </Col>
              <Col span={12} className="flex *:min-w-0 *:flex-1">
                <PhotoPanel
                  src={signInPhoto}
                  direction="to bottom"
                  scrim={[
                    [0, 0],
                    [0.45, 0.4],
                    [1, 0.96],
                  ]}
                  focus="center 30%"
                  className="flex h-[240px] flex-col justify-end rounded-lg p-6"
                >
                  <span className="type-h4 text-ink">Text on the scrim</span>
                  <span className="type-body-s text-ink-2">
                    Always Dark tokens, whatever the theme.
                  </span>
                </PhotoPanel>
              </Col>
            </GridRow>
          </Section>
        </Flex>
      </main>
      <Footer />
    </div>
  );
};

export default DesignSystemPage;
