import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pagination, Skeleton } from 'antd';

import { archivedChip, horseCardProps } from './components/horseCardProps';
import FirstRun from './FirstRun';
import { AddHorseCard } from './AddHorseCard';

import PageHeader from '@/components/PageHeader';
import { Button, Callout, HorseCard, Tabs } from '@/components/ui';
import { useMe } from '@/hooks/auth';
import { useHorseCount, useHorses } from '@/hooks/horse';
import { ict } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

type Tab = 'active' | 'archived';

/** My horses (spec §4): the club's horses as cards, in Active and Archived tabs. */
const MyHorsesPage: FC = () => {
  const router = useCustomRouter();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('archived') === 'true' ? 'archived' : 'active';
  const archived = tab === 'archived';

  const { listQuery, pageState, setPageState } = useHorses(archived);
  const me = useMe();
  const activeCount = useHorseCount(false, true);
  const page = listQuery.data;
  const activeEmpty = activeCount.data === 0;
  const archivedCount = useHorseCount(true, activeEmpty);
  const firstRun = activeEmpty && archivedCount.data === 0;

  const today = ict(new Date().toISOString()).format('YYYY-MM-DD');
  const toAdd = () => router.push(router.paths.get('horse-new'));
  const toProfile = (id: string) =>
    router.push(router.paths.get('horse-profile', { pathParams: [id] }));
  const toEdit = (id: string) => router.push(router.paths.get('horse-edit', { pathParams: [id] }));

  const n = activeCount.data;
  const club = me.data?.clubName;
  const summary =
    n === undefined
      ? 'Profiles feed transport requests, load plans and document checks.'
      : `${n} ${n === 1 ? 'horse' : 'horses'}${club ? ` · ${club}` : ''}. Profiles feed transport requests, load plans and document checks.`;

  const setTab = (next: Tab) => {
    setParams(next === 'archived' ? { archived: 'true' } : {});
    setPageState((prev) => ({ ...prev, number: 0 }));
  };

  const body = () => {
    if (listQuery.isPending || activeCount.isPending) {
      return (
        <div className="grid grid-cols-3 gap-6" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton.Node key={i} active className="!h-[420px] !w-full" />
          ))}
        </div>
      );
    }
    if (listQuery.isError || !page) {
      return (
        <Callout
          tone="bad"
          title="Your horses didn't load"
          action={
            <Button size="sm" onClick={() => listQuery.refetch()}>
              Try again
            </Button>
          }
        >
          Nothing has changed. Check your connection and try again.
        </Callout>
      );
    }
    if (firstRun) return <FirstRun onAdd={toAdd} />;
    if (page.empty) {
      return archived ? (
        <p className="type-body-m m-0 text-ink-2">
          No archived horses. Archiving keeps a horse’s history but takes it off new requests.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="type-body-m m-0 text-ink-2">
            No active horses. Add one, or see the Archived tab.
          </p>
          <div className="grid grid-cols-3 gap-6">
            <AddHorseCard onClick={toAdd} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 items-start gap-6">
          {page.content.map((horse) => (
            <HorseCard
              key={horse.id}
              {...horseCardProps(horse, today)}
              status={horse.archivedAt ? archivedChip(horse.archivedAt) : undefined}
              actions={
                <>
                  <Button onClick={() => toProfile(horse.id)}>Open profile</Button>
                  {!horse.archivedAt && (
                    <Button variant="ghost" leadingIcon="pencil" onClick={() => toEdit(horse.id)}>
                      Edit
                    </Button>
                  )}
                </>
              }
            />
          ))}
          {!archived && page.last && <AddHorseCard onClick={toAdd} />}
        </div>
        {page.totalPages > 1 && (
          <Pagination
            align="center"
            current={pageState.number + 1}
            pageSize={pageState.size}
            total={page.totalElements}
            showSizeChanger={false}
            onChange={(p) => setPageState((prev) => ({ ...prev, number: p - 1 }))}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        reserveBack
        title="My horses"
        summary={summary}
        right={
          !firstRun && (
            <Button leadingIcon="plus" onClick={toAdd}>
              Add a horse
            </Button>
          )
        }
      />
      {!firstRun && (
        <Tabs<Tab>
          label="Horse lists"
          items={[
            { key: 'active', label: 'Active' },
            { key: 'archived', label: 'Archived' },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
      )}
      {body()}
    </div>
  );
};

export default MyHorsesPage;
