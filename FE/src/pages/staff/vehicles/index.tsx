import { useCallback, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row } from 'antd';

import AddVehicleModal from './ViewAddEdit/AddVehicleModal';
import BookVehicleModal from './ViewAddEdit/BookVehicleModal';
import AvailableOnModal from './ViewAddEdit/AvailableOnModal';
import EditPermitsModal from './ViewAddEdit/EditPermitsModal';
import VehicleList from './VehicleList';

import PageHeader from '@/components/PageHeader';
import { StatTile } from '@/components/ui';
import { useActiveVehicles, useVehicleList } from '@/hooks/useVehicle';
import type { Vehicle } from '@/interfaces';

const SORT_NOTE: Record<string, [string, string]> = {
  code: ['code, A to Z', 'code, Z to A'],
  payloadKg: ['payload, lightest first', 'payload, heaviest first'],
  status: ['status, A to Z', 'status, Z to A'],
};

/** Vehicles (fleet coordinator): the trailers and trucks, their stalls, and booking them out. */
const VehiclesPage = () => {
  const crud = useVehicleList();
  const active = useActiveVehicles();
  const [adding, setAdding] = useState(false);
  const [booking, setBooking] = useState<Vehicle | null>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [expected, setExpected] = useState<Vehicle | null>(null);
  const { listQuery, pageState, setPageState } = crud;
  const total = listQuery.data?.totalElements;
  const activeCount = active.data?.length;
  const sort = pageState.sort;
  const onBook = useCallback((v: Vehicle) => setBooking(v), []);
  const onEditPermits = useCallback((v: Vehicle) => setEditing(v), []);
  const onSetAvailableOn = useCallback((v: Vehicle) => setExpected(v), []);

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Vehicles"
        summary="The horse trailers and rigid trucks, their stall layouts, and when each is booked out."
        right={
          <Button icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            Add vehicle
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatTile
            className="h-full"
            tone="neutral"
            value={total === undefined ? '—' : String(total)}
            label="In the fleet"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatTile
            className="h-full"
            tone="ok"
            value={activeCount === undefined ? '—' : String(activeCount)}
            label="Active in service"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatTile
            className="h-full"
            tone={
              total !== undefined && activeCount !== undefined && total > activeCount
                ? 'warn'
                : 'neutral'
            }
            value={
              total === undefined || activeCount === undefined ? '—' : String(total - activeCount)
            }
            label="Out of service"
          />
        </Col>
      </Row>

      <Flex gap={8} align="center" style={{ minHeight: 32 }}>
        <span className="type-label-s text-ink">
          {total === undefined ? 'Vehicles' : `${total} ${total === 1 ? 'vehicle' : 'vehicles'}`}
        </span>
        <span className="type-body-s text-ink-3">
          {sort && SORT_NOTE[sort.field]
            ? `Sorted by ${SORT_NOTE[sort.field][sort.order === 'ascend' ? 0 : 1]}`
            : 'Order: by code, A to Z'}
        </span>
        {sort && (
          <Button
            type="text"
            size="small"
            onClick={() => setPageState((p) => ({ ...p, number: 0, sort: undefined }))}
          >
            Reset order
          </Button>
        )}
      </Flex>

      {/* Loading is the table's own spinner; a failed load goes to the error boundary. */}
      <VehicleList
        crud={crud}
        onBook={onBook}
        onEditPermits={onEditPermits}
        onSetAvailableOn={onSetAvailableOn}
      />

      <AddVehicleModal open={adding} crud={crud} onClose={() => setAdding(false)} />
      <BookVehicleModal vehicle={booking} onClose={() => setBooking(null)} />
      <EditPermitsModal vehicle={editing} onClose={() => setEditing(null)} />
      <AvailableOnModal vehicle={expected} onClose={() => setExpected(null)} />
    </Flex>
  );
};

export default VehiclesPage;
