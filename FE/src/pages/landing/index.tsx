import { Col, Flex, Row } from 'antd';
import { motion, MotionConfig } from 'motion/react';
import type { FC } from 'react';

import { Corridors } from './Corridors';
import { IN_VIEW, rise, stagger } from './motion';
import { RouteMap } from './RouteMap';
import { QuoteVisual } from './QuoteVisual';
import { TravelPass } from './TravelPass';
import { WidthVisual } from './WidthVisual';
import { WindowVisual } from './WindowVisual';
import { Section } from './Section';

import heroPhoto from '@/assets/photos/draft-hero-loading-dawn.jpg';
import Brand from '@/components/Brand';
import Footer from '@/components/Footer';
import ThemeToggle from '@/components/ThemeToggle';
import { Button, Icon, PhotoPanel } from '@/components/ui';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';

const SERVICES = [
  {
    name: 'Road, within one country',
    what: 'Shared or private trailer runs between training centres, studs and racecourses.',
    scope: 'One country · 3 days’ notice',
    price: 'Distance, a shared or private trailer, each horse’s stall',
  },
  {
    name: 'Road, across borders',
    what: 'Door to door, with every border document prepared and filed for you.',
    scope: 'Vietnam, Cambodia, Thailand, Laos, Malaysia · 21 days’ notice',
    price: 'Border crossings, distance, grooms, a shared or private trailer',
  },
  {
    name: 'Air',
    what: 'Stall positions planned by width: 32 in, 48 in or a full 96 in box, with a flying groom on board.',
    scope: 'Economy, Business and First stalls',
    price: 'Stall width, pre-export isolation, flying grooms',
  },
];

/* The tracker's seven stages in four phases, each with its owner and the rule it holds to. */
const PHASES = [
  {
    stages: 'Stages 1–2',
    title: 'Request and Quotation',
    body: 'Tell us the horses, route and dates. You see an indicative range straight away; the itemised quotation follows review.',
    owner: 'Logistics Manager',
    rule: '21 days’ notice across a border, 3 within one country. Quotations hold for a week.',
  },
  {
    stages: 'Stages 3–4',
    title: 'Approval and Documents',
    body: 'You accept, the job is approved and your document checklist opens.',
    owner: 'Logistics Manager, then Transport Specialist',
    rule: 'A refused document always says why, and what a new one must show.',
  },
  {
    stages: 'Stages 5–6',
    title: 'Clearance and Trip',
    body: 'Departure unlocks only when every document clears. On the road, the escort records each checkpoint and how the horses are.',
    owner: 'Transport Specialist, then Fleet & Route Coordinator',
    rule: 'One groom for every three horses, rounded up, so four horses travel with two.',
  },
  {
    stages: 'Stage 7',
    title: 'Handover',
    body: 'You confirm the horses arrived sound, or report a problem, and the job closes.',
    owner: 'You, with the escort',
    rule: 'Nothing is overwritten: every document version and record is kept.',
  },
];

/* What the pass promises, beside the example. */
const PASS_POINTS = [
  'Dates worked out for your route and departure',
  'Every upload checked against those dates, not today',
  'Departure unlocks the moment every document clears',
];

const FEATURES = [
  {
    visual: <WindowVisual />,
    title: 'Caught before departure day',
    body: 'A Coggins test that is valid today but 77 days old on departure day is flagged now, with the date a new test must carry.',
  },
  {
    visual: <WidthVisual />,
    title: 'Stalls planned by width',
    body: 'A 96 in air stall takes three standard horses, two at 48 in, or one in a full box. Stallions get box stalls and never stand beside a mare.',
  },
  {
    visual: <QuoteVisual />,
    title: 'Quotes that say what can move',
    body: 'Every line shows its basis. Lines that can change on the final invoice, such as waiting time, are marked before you accept.',
  },
];

/**
 * The signed-out landing page (DESIGN.md, Landing): what EquiFreight does, the services and how
 * a move runs. Its own header, no app nav. The hero is a full-bleed photograph of a horse being
 * loaded, so it is Dark whatever the theme, with the copy on the scrim. The hero's gold is the one exception to the One Gold
 * Button rule, repeated by the closing band 2,000 px below it. Open to everyone: a signed-in
 * visitor reaches it from the brand, and their header and calls to action lead back to their work.
 */
const LandingPage: FC = () => {
  const router = useCustomRouter();
  const isAuthenticated = useAuthStore((state) => !!state.tokens?.accessToken);
  const roles = useAuthStore((state) => state.roles);

  // Requesting transport needs a club account: a returning club signs in, a new one signs up.
  // A signed-in visitor already has one, so every call to action leads to their own home.
  const toHome = () => router.push(primaryRoleHome(roles));
  const toSignIn = () => router.push(router.paths.get('login'));
  const toRequest = isAuthenticated ? toHome : toSignIn;
  const toSignUp = () => router.push(router.paths.get('register'));
  const toHowItWorks = () =>
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <MotionConfig reducedMotion="user">
      <Flex vertical className="min-h-screen bg-canvas">
        <header className="h-16 shrink-0 border-b border-line px-10">
          <Flex align="center" justify="space-between" className="h-full">
            <Brand />
            <Flex component="nav" aria-label="Account" align="center" gap={8}>
              <Button size="sm" variant="ghost" leadingIcon="info" onClick={toHowItWorks}>
                Help
              </Button>
              <ThemeToggle />
              {isAuthenticated ? (
                <Button size="sm" trailingIcon="arrow-right" onClick={toHome}>
                  Go to my workspace
                </Button>
              ) : (
                <Button size="sm" onClick={toSignIn}>
                  Sign in
                </Button>
              )}
            </Flex>
          </Flex>
        </header>

        <main className="flex-1">
          <PhotoPanel
            src={heroPhoto}
            alt="A groom leads a horse in a quilted rug down the ramp of a horse lorry before dawn."
            scrim={[
              [0, 0.96],
              [0.45, 0.7],
              [0.75, 0.2],
              [1, 0.1],
            ]}
            className="h-[720px]"
          >
            <div className="mx-auto h-full max-w-[1200px]">
              <Flex align="center" className="h-full">
                <motion.div
                  variants={stagger(0.12, 0.15)}
                  initial="hidden"
                  animate="shown"
                  className="flex w-[620px] flex-col gap-6"
                >
                  <motion.h1 variants={rise} className="type-display-xl m-0 text-ink">
                    Precision <em className="italic">transport</em>
                    <br />
                    for every horse
                  </motion.h1>
                  <motion.p variants={rise} className="type-body-l m-0 max-w-[560px] text-ink-2">
                    Road and air moves across Vietnam, Cambodia, Thailand, Laos, Malaysia and Hong
                    Kong. Every document is checked against your travel dates, and no horse leaves
                    until clearance is complete.
                  </motion.p>
                  <motion.div variants={rise} className="flex gap-3">
                    <Button variant="primary" trailingIcon="arrow-right" onClick={toRequest}>
                      Request transport
                    </Button>
                    {!isAuthenticated && <Button onClick={toSignUp}>Create a club account</Button>}
                  </motion.div>
                </motion.div>
              </Flex>
            </div>
          </PhotoPanel>

          <div className="mx-auto w-full max-w-[1200px] pb-24">
            <section aria-labelledby="pass-title" className="pt-20">
              <Flex align="center" gap={64}>
                <motion.div
                  variants={stagger(0.1)}
                  initial="hidden"
                  whileInView="shown"
                  viewport={IN_VIEW}
                  className="flex min-w-0 flex-1 flex-col gap-4"
                >
                  <motion.h2
                    variants={rise}
                    id="pass-title"
                    className="type-display-l m-0 text-ink"
                  >
                    Every move, on one pass
                  </motion.h2>
                  <motion.p variants={rise} className="type-body-m m-0 max-w-[520px] text-ink-2">
                    Once a request is approved, the move gets its own pass: the route, the
                    departure, your arrival window, and the date each document must carry for the
                    crossings on your route.
                  </motion.p>
                  <div className="pt-2">
                    <motion.ul
                      variants={stagger(0.1)}
                      className="m-0 flex list-none flex-col gap-2.5 p-0"
                    >
                      {PASS_POINTS.map((point) => (
                        <motion.li
                          key={point}
                          variants={rise}
                          className="type-body-m flex items-center gap-2.5 text-ink"
                        >
                          <Icon name="check" size={16} className="shrink-0 text-ok" />
                          {point}
                        </motion.li>
                      ))}
                    </motion.ul>
                  </div>
                </motion.div>
                <TravelPass />
              </Flex>
            </section>

            <Section
              id="services"
              title="Three ways to move a racehorse"
              summary="Each is priced from the same rate catalog and itemised line by line. A veterinary escort and transit insurance can be added to any of them."
            >
              {/* A fixed-order table: no sort, no filters, and no price figures (an estimate is always a range). */}
              <div className="overflow-hidden rounded-lg border border-line bg-card">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-sunken">
                    <tr>
                      <th className="type-mono-label px-4 py-2.5 font-normal text-ink-3">
                        Service
                      </th>
                      <th className="type-mono-label w-[220px] px-4 py-2.5 font-normal text-ink-3">
                        Scope
                      </th>
                      <th className="type-mono-label w-[320px] px-4 py-2.5 font-normal text-ink-3">
                        What drives the price
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SERVICES.map((s) => (
                      <tr key={s.name} className="border-t border-line align-middle">
                        <td className="px-4 py-3">
                          <Flex component="span" vertical gap={4}>
                            <span className="type-h4 text-ink">{s.name}</span>
                            <span className="type-body-s text-ink-2">{s.what}</span>
                          </Flex>
                        </td>
                        <td className="type-body-s px-4 py-3 text-ink-2">{s.scope}</td>
                        <td className="type-body-s px-4 py-3 text-ink-2">{s.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section
              id="where"
              title="Where we move horses"
              summary="Six countries by road, and Hong Kong by air. Every border crossing has its own document rules, and each one is checked against your travel dates."
            >
              <Flex align="start" gap={24}>
                <RouteMap />
                <Corridors />
              </Flex>
            </Section>

            <Section
              id="how-it-works"
              title="Seven stages in four phases"
              summary="Your request page tracks the same seven stages, each with a named owner. The next never starts until the one before it is done, and each holds to a rule."
            >
              <motion.ol
                variants={stagger(0.1)}
                className="m-0 grid list-none grid-cols-4 gap-6 p-0"
              >
                {PHASES.map((p) => (
                  <motion.li key={p.title} variants={rise} className="border-t border-line pt-6">
                    <Flex vertical gap={12} className="h-full">
                      <span className="type-label-s text-ink-3">{p.stages}</span>
                      <h3 className="type-h3 m-0 text-ink">{p.title}</h3>
                      <p className="type-body-s m-0 text-ink-2">{p.body}</p>
                      <p className="type-body-s m-0 text-ink-3">Owner: {p.owner}</p>
                      <p className="type-body-s m-0 mt-auto border-t border-line pt-3 text-ink-2">
                        <Flex component="span" gap={8}>
                          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-ok" />
                          {p.rule}
                        </Flex>
                      </p>
                    </Flex>
                  </motion.li>
                ))}
              </motion.ol>
            </Section>

            <Section id="features" title="Built around the paperwork and the horse">
              <motion.div variants={stagger(0.1)}>
                <Row gutter={[24, 24]}>
                  {FEATURES.map((f) => (
                    <Col key={f.title} span={8}>
                      <motion.article
                        variants={rise}
                        className="h-full rounded-lg border border-line bg-card p-7"
                      >
                        <Flex vertical gap={16}>
                          {f.visual}
                          <h3 className="type-h3 m-0 text-ink">{f.title}</h3>
                          <p className="type-body-s m-0 text-ink-2">{f.body}</p>
                        </Flex>
                      </motion.article>
                    </Col>
                  ))}
                </Row>
              </motion.div>
            </Section>

            <section className="pt-20">
              <motion.div
                variants={rise}
                initial="hidden"
                whileInView="shown"
                viewport={IN_VIEW}
                className="rounded-lg border border-line bg-card px-12 py-10"
              >
                <Flex align="center" justify="space-between" gap={48}>
                  <Flex vertical gap={10}>
                    <h2 className="type-display-m m-0 text-ink">
                      Send us the horses, the route and the date
                    </h2>
                    <p className="type-body-m m-0 text-ink-2">
                      Nothing is booked until you accept the itemised quotation.
                    </p>
                  </Flex>
                  <Button variant="primary" trailingIcon="arrow-right" onClick={toRequest}>
                    Request transport
                  </Button>
                </Flex>
              </motion.div>
            </section>
          </div>
        </main>

        <Footer />
      </Flex>
    </MotionConfig>
  );
};

export default LandingPage;
