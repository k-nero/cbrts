import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Input } from 'antd';
import { useSearchParams } from 'react-router-dom';

import AddCorridorModal from './AddCorridorModal';
import AddCrossingModal from './AddCrossingModal';
import AddPlaceModal from './AddPlaceModal';
import CorridorList from './CorridorList';
import CrossingList from './CrossingList';
import DrivingDaysModal from './DrivingDaysModal';
import EditCorridorModal from './EditCorridorModal';
import PlaceList from './PlaceList';

import PageHeader from '@/components/PageHeader';
import { Tabs } from '@/components/ui';
import { useCorridorList, useDeleteBorderCrossing, usePlaceList } from '@/hooks/routeCatalog';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { useBorderCrossings } from '@/hooks/useJob';
import type { BorderCrossing, Corridor, Place } from '@/interfaces';

const TABS = ['routes', 'crossings', 'places'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  routes: 'Routes',
  crossings: 'Border crossings',
  places: 'Places',
};

const asTab = (value: string | null): Tab =>
  TABS.includes(value as Tab) ? (value as Tab) : 'routes';

/** "Sorted by name, A to Z" / "Sorted by city, Z to A". */
const placeSortNote = (field: string, order: 'ascend' | 'descend') =>
  `Sorted by ${field === 'city' ? 'city' : 'name'}, ${order === 'ascend' ? 'A to Z' : 'Z to A'}`;

/**
 * Routes (fleet & route coordinator): the corridors we run, the border crossings they take and the
 * places they start and end at, one tab each. A new route needs a place in each city; it has no
 * rates until the transport specialist prices it in the draft rate version.
 */
const CorridorsPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = asTab(params.get('tab'));
  // The first tab is the page itself ("Routes"); the others add a part ("Routes / Places").
  useBreadcrumb({ tab: tab === 'routes' ? undefined : TAB_LABELS[tab] });
  const crud = useCorridorList();
  const places = usePlaceList();
  const crossings = useBorderCrossings(true);
  const [adding, setAdding] = useState(false);
  const [addingPlace, setAddingPlace] = useState(false);
  const [addingCrossing, setAddingCrossing] = useState(false);
  const [editingDays, setEditingDays] = useState<Corridor | null>(null);
  const [editing, setEditing] = useState<Corridor | null>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [editingCrossing, setEditingCrossing] = useState<BorderCrossing | null>(null);
  const deleteCrossing = useDeleteBorderCrossing();
  const confirmDelete = useConfirmDelete();
  const routeTotal = crud.listQuery.data?.totalElements;
  const placeTotal = places.listQuery.data?.totalElements;
  const crossingTotal = crossings.data?.length;
  const placeSort = places.pageState.sort;

  const setTab = (next: Tab) =>
    setParams(
      (p) => {
        if (next === 'routes') p.delete('tab');
        else p.set('tab', next);
        return p;
      },
      { replace: true },
    );

  const onDeleteRoute = (c: Corridor) =>
    confirmDelete({
      title: `Delete ${c.code}?`,
      content: `${c.originCity} → ${c.destinationCity} can no longer be estimated or quoted. A route requests, trips, rates or vehicles use stays.`,
      run: () => crud.deleteCorridor.mutateAsync(c.id),
      done: `${c.code} deleted.`,
      failed: `${c.code} wasn’t deleted.`,
    });
  const onDeleteCrossing = (c: BorderCrossing) =>
    confirmDelete({
      title: `Delete ${c.name}?`,
      content: 'A new route can no longer take it. A crossing a route or trip uses stays.',
      run: () => deleteCrossing.mutateAsync(c.id),
      done: `${c.name} deleted.`,
      failed: `${c.name} wasn’t deleted.`,
    });
  const onDeletePlace = (p: Place) =>
    confirmDelete({
      title: `Delete ${p.name}?`,
      content: `Requests can no longer start or end there. A place requests or trips use stays, as does the last place in a city a route needs.`,
      run: () => places.deletePlace.mutateAsync(p.id),
      done: `${p.name} deleted.`,
      failed: `${p.name} wasn’t deleted.`,
    });

  const action =
    tab === 'places' ? (
      <Button icon={<PlusOutlined />} onClick={() => setAddingPlace(true)}>
        Add place
      </Button>
    ) : tab === 'crossings' ? (
      <Button icon={<PlusOutlined />} onClick={() => setAddingCrossing(true)}>
        Add border crossing
      </Button>
    ) : (
      <Button icon={<PlusOutlined />} onClick={() => setAdding(true)}>
        New route
      </Button>
    );

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Routes"
        summary="The corridors we run, the border crossings each takes and the places they start and end at. Only a route listed here can be estimated or quoted; a new one is priced in the draft rate version."
        right={action}
      />

      <Flex vertical gap={16}>
        <Tabs
          label="Route catalog"
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'routes', label: TAB_LABELS.routes, count: routeTotal },
            { key: 'crossings', label: TAB_LABELS.crossings, count: crossingTotal },
            { key: 'places', label: TAB_LABELS.places, count: placeTotal },
          ]}
        />

        {tab === 'routes' && (
          <>
            <Flex gap={8} align="center" style={{ minHeight: 32 }}>
              <span className="type-label-s text-ink">
                {routeTotal === undefined
                  ? 'Routes'
                  : `${routeTotal} ${routeTotal === 1 ? 'route' : 'routes'}`}
              </span>
              <span className="type-body-s text-ink-3">Order: by code, A to Z</span>
            </Flex>
            {/* Loading is the table's own spinner; a failed load goes to the error boundary. */}
            <CorridorList
              crud={crud}
              onEdit={setEditing}
              onDelete={onDeleteRoute}
              onEditDrivingDays={setEditingDays}
            />
          </>
        )}

        {tab === 'crossings' && (
          <>
            <Flex gap={8} align="center" style={{ minHeight: 32 }}>
              <span className="type-label-s text-ink">
                {crossingTotal === undefined
                  ? 'Border crossings'
                  : `${crossingTotal} ${crossingTotal === 1 ? 'border crossing' : 'border crossings'}`}
              </span>
              <span className="type-body-s text-ink-3">Order: by name, A to Z</span>
            </Flex>
            <CrossingList
              crossings={crossings}
              onEdit={setEditingCrossing}
              onDelete={onDeleteCrossing}
            />
          </>
        )}

        {tab === 'places' && (
          <>
            <Flex vertical gap={8}>
              <label htmlFor="places-search" className="type-label-s text-ink-2">
                Search
              </label>
              <Input.Search
                id="places-search"
                allowClear
                placeholder="Place or city"
                style={{ width: 360 }}
                onSearch={places.setSearch}
              />
            </Flex>
            <Flex gap={8} align="center" style={{ minHeight: 32 }}>
              <span className="type-label-s text-ink">
                {placeTotal === undefined
                  ? 'Places'
                  : `${placeTotal} ${placeTotal === 1 ? 'place' : 'places'}`}
              </span>
              <span className="type-body-s text-ink-3">
                {placeSort
                  ? placeSortNote(placeSort.field, placeSort.order)
                  : 'Order: by city, then name'}
              </span>
              {placeSort && (
                <Button
                  type="text"
                  size="small"
                  onClick={() => places.setPageState((p) => ({ ...p, number: 0, sort: undefined }))}
                >
                  Reset order
                </Button>
              )}
            </Flex>
            <PlaceList crud={places} onEdit={setEditingPlace} onDelete={onDeletePlace} />
          </>
        )}
      </Flex>

      <AddCorridorModal
        open={adding}
        create={crud.createCorridor}
        onClose={() => setAdding(false)}
        onAddPlace={() => setAddingPlace(true)}
        onAddCrossing={() => setAddingCrossing(true)}
      />
      <EditCorridorModal
        corridor={editing}
        onClose={() => setEditing(null)}
        onAddCrossing={() => setAddingCrossing(true)}
      />
      <AddPlaceModal open={addingPlace} onClose={() => setAddingPlace(false)} />
      <AddPlaceModal
        open={editingPlace !== null}
        place={editingPlace}
        update={places.updatePlace}
        onClose={() => setEditingPlace(null)}
      />
      <AddCrossingModal open={addingCrossing} onClose={() => setAddingCrossing(false)} />
      <AddCrossingModal
        open={editingCrossing !== null}
        crossing={editingCrossing}
        onClose={() => setEditingCrossing(null)}
      />
      <DrivingDaysModal corridor={editingDays} onClose={() => setEditingDays(null)} />
    </Flex>
  );
};

export default CorridorsPage;
