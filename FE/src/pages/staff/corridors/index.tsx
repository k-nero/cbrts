import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';

import AddCorridorModal from './AddCorridorModal';
import AddCrossingModal from './AddCrossingModal';
import AddPlaceModal from './AddPlaceModal';
import CorridorList from './CorridorList';
import DrivingDaysModal from './DrivingDaysModal';

import PageHeader from '@/components/PageHeader';
import { useCorridorList } from '@/hooks/routeCatalog';
import type { Corridor } from '@/interfaces';

/**
 * Routes (fleet & route coordinator): the corridors we run, with their border crossings. A new
 * route needs a place in each city; it has no rates until the transport specialist prices it in
 * the draft rate version.
 */
const CorridorsPage = () => {
  const crud = useCorridorList();
  const [adding, setAdding] = useState(false);
  const [addingPlace, setAddingPlace] = useState(false);
  const [addingCrossing, setAddingCrossing] = useState(false);
  const [editing, setEditing] = useState<Corridor | null>(null);
  const total = crud.listQuery.data?.totalElements;

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Routes"
        summary="The corridors we run and the border crossings each takes. Only a route listed here can be estimated or quoted; a new one is priced in the draft rate version."
        right={
          <Flex gap={8}>
            <Button onClick={() => setAddingPlace(true)}>Add place</Button>
            <Button onClick={() => setAddingCrossing(true)}>Add border crossing</Button>
            <Button icon={<PlusOutlined />} onClick={() => setAdding(true)}>
              New route
            </Button>
          </Flex>
        }
      />

      <Flex gap={8} align="center" style={{ minHeight: 32 }}>
        <span className="type-label-s text-ink">
          {total === undefined ? 'Routes' : `${total} ${total === 1 ? 'route' : 'routes'}`}
        </span>
        <span className="type-body-s text-ink-3">Order: by code, A to Z</span>
      </Flex>

      {/* Loading is the table's own spinner; a failed load goes to the error boundary. */}
      <CorridorList crud={crud} onEditDrivingDays={setEditing} />

      <AddCorridorModal
        open={adding}
        create={crud.createCorridor}
        onClose={() => setAdding(false)}
        onAddPlace={() => setAddingPlace(true)}
        onAddCrossing={() => setAddingCrossing(true)}
      />
      <AddPlaceModal open={addingPlace} onClose={() => setAddingPlace(false)} />
      <AddCrossingModal open={addingCrossing} onClose={() => setAddingCrossing(false)} />
      <DrivingDaysModal corridor={editing} onClose={() => setEditing(null)} />
    </Flex>
  );
};

export default CorridorsPage;
