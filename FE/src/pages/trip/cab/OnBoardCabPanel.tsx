import { Panel } from '@/components/ui';
import type { TripHorse } from '@/interfaces';

type Props = {
  horses: TripHorse[];
  crewSummary?: string;
};

export function OnBoardCabPanel({
  horses,
  crewSummary = 'Minh, driver · Hoa and Tuấn, grooms',
}: Props) {
  return (
    <Panel title="On board">
      <div className="divide-y divide-line">
        {horses.map((h) => (
          <div key={h.id} className="flex items-center justify-between py-2.5">
            <span className="type-label-m text-ink">{h.name}</span>
            <span className="type-body-s text-ink-2">{h.stall ?? 'Standard stall'}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2.5">
          <span className="type-label-m text-ink">Crew</span>
          <span className="type-body-s text-ink-2">{crewSummary}</span>
        </div>
      </div>
    </Panel>
  );
}
