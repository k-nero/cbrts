import { Flex } from 'antd';

import type { Picked } from './LoadPlanTab';
import { StallLegend } from './StallLegend';
import { StallSlot } from './StallSlot';

import { Button, Icon } from '@/components/ui';
import type { LoadPlan, LoadPlanStall } from '@/interfaces';

/**
 * One trailer of the trip (US-F3-10): its cab bar, stall rows and rear ramp. In a convoy the cab
 * bar numbers the trailer, shows its payload and offers to take it out; the stall legend is shown
 * once above the trailers instead.
 */
export function TrailerDiagram({
  plan,
  convoy,
  selected,
  dragging,
  interactive,
  disabled,
  onStallClick,
  onRemove,
  removing,
}: {
  plan: LoadPlan;
  /** True when the trip has more than one trailer. */
  convoy: boolean;
  selected: Picked | null;
  dragging: Picked | null;
  /** False on a confirmed plan: the tiles are read-only. */
  interactive: boolean;
  /** True while a move is pending: no new drag starts. */
  disabled: boolean;
  onStallClick: (stall: LoadPlanStall) => void;
  /** Set when the trailer can be taken out of the convoy. */
  onRemove?: () => void;
  removing?: boolean;
}) {
  // Group stalls into rows (row 1, row 2, etc.), each sorted by position.
  const rowsMap = new Map<number, LoadPlanStall[]>();
  plan.stalls.forEach((s) => {
    const r = s.rowNo || 1;
    if (!rowsMap.has(r)) rowsMap.set(r, []);
    rowsMap.get(r)!.push(s);
  });
  const sortedRowKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);

  return (
    <div className="p-5 rounded-2xl border border-line-strong bg-sunken">
      <Flex vertical gap={12}>
        {/* Cab Bar */}
        <div className="px-4 py-3 rounded-lg bg-muted">
          <Flex wrap align="center" justify="space-between" gap={12}>
            <Flex gap={8} align="center" className="whitespace-nowrap">
              <Icon name="truck" size={16} className="text-ink-2" />
              <span className="type-chip text-ink-2">
                {convoy ? `Trailer ${plan.seq} · ` : 'Cab · '}
                {plan.vehicleCode}
              </span>
              {convoy && (
                <span className="type-caption text-ink-3">
                  {plan.totalWeightKg.toLocaleString()} of {plan.payloadKg.toLocaleString()} kg
                </span>
              )}
            </Flex>
            {!convoy && <StallLegend />}
            {onRemove ? (
              <Button variant="ghost" size="sm" disabled={removing} onClick={onRemove}>
                {removing ? 'Removing…' : 'Remove trailer'}
              </Button>
            ) : (
              <span className="type-chip text-ink-3">Front</span>
            )}
          </Flex>
        </div>

        {/* Stall Rows */}
        <Flex vertical gap={16}>
          {sortedRowKeys.map((rowKey) => {
            const rowStalls = [...(rowsMap.get(rowKey) ?? [])].sort(
              (a, b) => a.positionNo - b.positionNo,
            );
            return (
              <div key={rowKey} className="grid grid-cols-2 gap-4">
                {rowStalls.map((s) => (
                  <StallSlot
                    key={s.stallId}
                    stall={s}
                    selected={selected}
                    dragging={dragging}
                    interactive={interactive}
                    disabled={disabled}
                    onClick={() => onStallClick(s)}
                  />
                ))}
              </div>
            );
          })}
        </Flex>

        {/* Rear Ramp */}
        <div className="py-2.5 rounded-lg border border-dashed border-line-strong">
          <Flex align="center" justify="center">
            <span className="type-chip text-ink-3">Rear ramp</span>
          </Flex>
        </div>
      </Flex>
    </div>
  );
}
