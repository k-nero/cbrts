import type { FC } from 'react';
import { Flex, Skeleton } from 'antd';

import { NothingOwed } from './NothingOwed';
import { OnTheRoad } from './OnTheRoad';
import { OwedPanel } from './OwedPanel';
import { YourHorses } from './YourHorses';
import { YourMoves } from './YourMoves';

import PageHeader from '@/components/PageHeader';
import { Button, Callout } from '@/components/ui';
import { useCustomerHome } from '@/hooks/home';
import type { CustomerHome, MoveEntry } from '@/interfaces';
import { formatTime, ict } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/** "3 requests in progress and 4 horses. Next departure: …, 18 Oct, locked until its documents clear." */
const summaryOf = (h: CustomerHome) => {
  const counts = `${h.requestCount} ${h.requestCount === 1 ? 'request' : 'requests'} in progress and ${h.horseCount} ${h.horseCount === 1 ? 'horse' : 'horses'}.`;
  const d = h.nextDeparture;
  if (!d) return counts;
  if (d.state === 'on-road')
    return `${counts} On the road now: ${d.route}, arriving about ${formatTime(d.arrivesAt ?? d.departsAt)}.`;
  const when = ict(d.departsAt).format('D MMM');
  const state = d.state === 'locked' ? 'locked until its documents clear' : 'cleared to depart';
  return `${counts} Next departure: ${d.route}, ${when}, ${state}.`;
};

/**
 * The signed-in club's Home (DESIGN.md, Home signed in): the club's work, not marketing. What it
 * owes leads (or that nothing is owed, with the next event), then its moves beside its horses.
 */
const CustomerHomePage: FC = () => {
  const router = useCustomRouter();
  const { data: home, isPending, isError, refetch } = useCustomerHome();
  const toRequests = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    router.push(router.paths.get('my-requests'));
  };
  const toHorses = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    router.push(router.paths.get('my-horses'));
  };
  const handleOpenMove = (m: MoveEntry) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    router.push(`${router.paths.get('my-requests')}?code=${encodeURIComponent(m.requestCode)}`);
  };

  if (isPending) {
    return (
      <div className="pt-[46px]" aria-busy>
        <Flex vertical gap={28}>
          <Skeleton active title={{ width: 360 }} paragraph={{ rows: 1, width: 640 }} />
          <Skeleton active paragraph={{ rows: 6 }} />
        </Flex>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pt-[46px]">
        <Callout
          tone="bad"
          title="Your Home didn't load"
          action={
            <Button size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          Nothing has changed on your requests. Check your connection and try again.
        </Callout>
      </div>
    );
  }

  return (
    <Flex vertical gap={28}>
      <PageHeader reserveBack title={home.clubName} summary={summaryOf(home)} />
      {home.owed.length > 0 ? (
        <OwedPanel home={home} onOpen={toRequests} onAllRequests={toRequests} />
      ) : (
        home.nextEvent && <NothingOwed event={home.nextEvent} asOf={home.asOf} />
      )}
      {home.trip && <OnTheRoad trip={home.trip} />}
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <YourMoves home={home} onOpen={handleOpenMove} onAll={toRequests} />
        <YourHorses home={home} onAll={toHorses} />
      </div>
    </Flex>
  );
};

export default CustomerHomePage;
