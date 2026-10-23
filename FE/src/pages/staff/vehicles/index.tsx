import { Col, Flex, Row } from 'antd';
import { useState } from 'react';
import { Button, Chip, Icon, Panel, StatTile } from '@/components/ui';
import {
  useBookVehicle,
  useCreateVehicle,
  useUpdateVehicle,
  useVehicles,
} from '@/hooks/useVehicle';
import type { StallSide, StallType, Vehicle, VehicleKind, VehicleStatus } from '@/interfaces';

export default function VehiclesPage() {
  const { data, isLoading } = useVehicles();
  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();
  const bookVehicleMutation = useBookVehicle();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form states for Add Vehicle
  const [newCode, setNewCode] = useState('');
  const [newKind, setNewKind] = useState<VehicleKind>('TRAILER');
  const [newPayload, setNewPayload] = useState<number>(3200);
  const [newStallCount, setNewStallCount] = useState<number>(4);

  // Form states for Booking
  const [bookingKind, setBookingKind] = useState<'JOB' | 'MAINTENANCE' | 'HOLD'>('MAINTENANCE');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);

  const vehicles = data?.content ?? [];
  const activeCount = vehicles.filter((v) => v.status === 'ACTIVE').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'MAINTENANCE').length;

  const handleCreateVehicle = () => {
    if (!newCode.trim()) return;

    // Generate basic stall layout for new vehicle
    const stalls = [];
    for (let i = 1; i <= newStallCount; i++) {
      const row = Math.ceil(i / 2);
      const side: StallSide = i % 2 !== 0 ? 'LEFT' : 'RIGHT';
      const type: StallType = i === 2 ? 'BOX' : i === 4 ? 'CLIMATE' : 'STANDARD';
      const nearRamp = row === Math.ceil(newStallCount / 2);
      stalls.push({
        positionNo: i,
        stallType: type,
        rowNo: row,
        side,
        nearRamp,
      });
    }

    createVehicleMutation.mutate(
      {
        code: newCode.trim(),
        kind: newKind,
        payloadKg: Number(newPayload),
        stalls,
      },
      {
        onSuccess: () => {
          setAddModalOpen(false);
          setNewCode('');
        },
      },
    );
  };

  const handleOpenBooking = (v: Vehicle) => {
    setSelectedVehicle(v);
    setBookingError(null);
    setBookingModalOpen(true);
  };

  const handleBookVehicle = () => {
    if (!selectedVehicle || !startsAt || !endsAt) return;
    setBookingError(null);

    bookVehicleMutation.mutate(
      {
        vehicleId: selectedVehicle.id,
        kind: bookingKind,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      },
      {
        onSuccess: () => {
          setBookingModalOpen(false);
          setStartsAt('');
          setEndsAt('');
        },
        onError: (err: any) => {
          setBookingError(err?.response?.data?.message || err?.message || 'Failed to book vehicle');
        },
      },
    );
  };

  const handleToggleStatus = (v: Vehicle) => {
    const nextStatus: VehicleStatus = v.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
    updateVehicleMutation.mutate({
      id: v.id,
      body: { status: nextStatus },
    });
  };

  return (
    <div className="p-8">
      <Flex vertical gap={32}>
        {/* Header */}
        <Flex wrap gap={16} align="center" justify="space-between">
          <Flex vertical gap={4}>
            <h1 className="type-display-m text-ink">Vehicles & Fleet</h1>
            <p className="type-body-m text-ink-2">
              Specialised horse trailers, rigid trucks and stall configurations.
            </p>
          </Flex>

          <Button
            variant="primary"
            size="md"
            leadingIcon="plus"
            onClick={() => setAddModalOpen(true)}
          >
            Add vehicle
          </Button>
        </Flex>

        {/* Stats */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <StatTile
              className="h-full"
              tone="neutral"
              value={String(vehicles.length)}
              label="Total fleet"
            />
          </Col>
          <Col xs={24} sm={8}>
            <StatTile
              className="h-full"
              tone="ok"
              value={String(activeCount)}
              label="Active in service"
            />
          </Col>
          <Col xs={24} sm={8}>
            <StatTile
              className="h-full"
              tone={maintenanceCount > 0 ? 'warn' : 'neutral'}
              value={String(maintenanceCount)}
              label="In maintenance"
            />
          </Col>
        </Row>

        {/* Vehicle Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-ink-3">Loading fleet...</div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-12 text-center text-ink-3">
            No vehicles registered.
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {vehicles.map((v) => {
              const standardCount = v.stalls?.filter((s) => s.stallType === 'STANDARD').length || 0;
              const boxCount = v.stalls?.filter((s) => s.stallType === 'BOX').length || 0;
              const climateCount = v.stalls?.filter((s) => s.stallType === 'CLIMATE').length || 0;

              return (
                <Col key={v.id} xs={24} md={12} lg={8}>
                  <Panel className="h-full p-6 flex flex-col justify-between gap-6 shadow-xs">
                    <Flex vertical gap={16}>
                      <Flex align="center" justify="space-between">
                        <Flex gap={8} align="center">
                          <Icon name="truck" size={18} className="text-ink-2" />
                          <span className="type-h3 text-ink font-semibold">{v.code}</span>
                        </Flex>
                        <Chip tone={v.status === 'ACTIVE' ? 'ok' : 'warn'}>{v.status}</Chip>
                      </Flex>

                      <div className="pt-3 border-t border-line">
                        <Flex vertical gap={6}>
                          <Flex justify="space-between" className="type-body-s">
                            <span className="text-ink-3">Type</span>
                            <span className="text-ink font-medium capitalize">
                              {v.kind.toLowerCase()}
                            </span>
                          </Flex>
                          <Flex justify="space-between" className="type-body-s">
                            <span className="text-ink-3">Payload limit</span>
                            <span className="text-ink font-mono">
                              {v.payloadKg?.toLocaleString()} kg
                            </span>
                          </Flex>
                          <Flex justify="space-between" className="type-body-s">
                            <span className="text-ink-3">Total stalls</span>
                            <span className="text-ink font-medium">{v.stalls?.length || 0}</span>
                          </Flex>
                        </Flex>
                      </div>

                      {/* Stall breakdown */}
                      <div className="pt-2">
                        <Flex gap={12} align="center">
                          <Flex gap={6} align="center">
                            <span className="size-2 rounded-xs bg-stall-standard" />
                            <span className="type-caption text-ink-3">
                              {standardCount} Std (32″)
                            </span>
                          </Flex>
                          <Flex gap={6} align="center">
                            <span className="size-2 rounded-xs bg-stall-box" />
                            <span className="type-caption text-ink-3">{boxCount} Box (96″)</span>
                          </Flex>
                          <Flex gap={6} align="center">
                            <span className="size-2 rounded-xs bg-stall-climate" />
                            <span className="type-caption text-ink-3">
                              {climateCount} Climate (48″)
                            </span>
                          </Flex>
                        </Flex>
                      </div>
                    </Flex>

                    <div className="pt-4 border-t border-line">
                      <Flex gap={12} align="center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenBooking(v)}
                        >
                          Book slot
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(v)}>
                          {v.status === 'ACTIVE' ? 'Set maintenance' : 'Set active'}
                        </Button>
                      </Flex>
                    </div>
                  </Panel>
                </Col>
              );
            })}
          </Row>
        )}

        {/* Add Vehicle Modal */}
        {addModalOpen && (
          <div className="p-4 fixed inset-0 z-50 bg-ink/40">
            <Flex align="center" justify="center" className="h-full">
              <div className="p-6 w-full max-w-md rounded-xl border border-line bg-card shadow-xl">
                <Flex vertical gap={20}>
                  <Flex align="center" justify="space-between">
                    <h3 className="type-h3 text-ink">Add new vehicle</h3>
                    <button
                      type="button"
                      onClick={() => setAddModalOpen(false)}
                      className="text-ink-3 hover:text-ink cursor-pointer"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </Flex>

                  <Flex vertical gap={16}>
                    <Flex vertical gap={6}>
                      <label className="type-label-s text-ink">Vehicle code</label>
                      <input
                        type="text"
                        placeholder="e.g. TX-550"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        className="focus-ring h-9 rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none"
                      />
                    </Flex>

                    <Flex vertical gap={6}>
                      <label className="type-label-s text-ink">Vehicle kind</label>
                      <select
                        value={newKind}
                        onChange={(e) => setNewKind(e.target.value as VehicleKind)}
                        className="focus-ring h-9 rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none"
                      >
                        <option value="TRAILER">Trailer</option>
                        <option value="TRUCK">Truck</option>
                      </select>
                    </Flex>

                    <Flex vertical gap={6}>
                      <label className="type-label-s text-ink">Payload capacity (kg)</label>
                      <input
                        type="number"
                        value={newPayload}
                        onChange={(e) => setNewPayload(Number(e.target.value))}
                        className="focus-ring h-9 rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none"
                      />
                    </Flex>

                    <Flex vertical gap={6}>
                      <label className="type-label-s text-ink">Number of stalls</label>
                      <input
                        type="number"
                        min={2}
                        max={8}
                        step={2}
                        value={newStallCount}
                        onChange={(e) => setNewStallCount(Number(e.target.value))}
                        className="focus-ring h-9 rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none"
                      />
                    </Flex>
                  </Flex>

                  <div className="pt-2">
                    <Flex gap={12} align="center" justify="end">
                      <Button variant="ghost" size="md" onClick={() => setAddModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={!newCode.trim() || createVehicleMutation.isPending}
                        onClick={handleCreateVehicle}
                      >
                        {createVehicleMutation.isPending ? 'Creating...' : 'Create vehicle'}
                      </Button>
                    </Flex>
                  </div>
                </Flex>
              </div>
            </Flex>
          </div>
        )}

        {/* Book Vehicle Modal */}
        {bookingModalOpen && selectedVehicle && (
          <div className="p-4 fixed inset-0 z-50 bg-ink/40">
            <Flex align="center" justify="center" className="h-full">
              <div className="p-6 w-full max-w-md rounded-xl border border-line bg-card shadow-xl">
                <Flex vertical gap={20}>
                  <Flex align="center" justify="space-between">
                    <h3 className="type-h3 text-ink">Book slot for {selectedVehicle.code}</h3>
                    <button
                      type="button"
                      onClick={() => setBookingModalOpen(false)}
                      className="text-ink-3 hover:text-ink cursor-pointer"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </Flex>

                  {bookingError && (
                    <div className="rounded-lg border border-bad/30 bg-bad-soft p-3">
                      <span className="type-body-s text-bad">{bookingError}</span>
                    </div>
                  )}

                  <Flex vertical gap={16}>
                    <Flex vertical gap={6}>
                      <label className="type-label-s text-ink">Booking kind</label>
                      <select
                        value={bookingKind}
                        onChange={(e) => setBookingKind(e.target.value as any)}
                        className="focus-ring h-9 rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none"
                      >
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="HOLD">Hold (Sanitisation / Inspection)</option>
                        <option value="JOB">Job transport</option>
                      </select>
                    </Flex>

                    <Flex vertical gap={6}>
                      <label className="type-label-s text-ink">Start time</label>
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="focus-ring h-9 rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none"
                      />
                    </Flex>

                    <Flex vertical gap={6}>
                      <label className="type-label-s text-ink">End time</label>
                      <input
                        type="datetime-local"
                        value={endsAt}
                        onChange={(e) => setEndsAt(e.target.value)}
                        className="focus-ring h-9 rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none"
                      />
                    </Flex>
                  </Flex>

                  <div className="pt-2">
                    <Flex gap={12} align="center" justify="end">
                      <Button variant="ghost" size="md" onClick={() => setBookingModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={!startsAt || !endsAt || bookVehicleMutation.isPending}
                        onClick={handleBookVehicle}
                      >
                        {bookVehicleMutation.isPending ? 'Booking...' : 'Confirm booking'}
                      </Button>
                    </Flex>
                  </div>
                </Flex>
              </div>
            </Flex>
          </div>
        )}
      </Flex>
    </div>
  );
}
