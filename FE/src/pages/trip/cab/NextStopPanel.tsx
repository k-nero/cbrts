import { Panel } from '@/components/ui';

type Props = {
  title: string;
  sub: string;
  time: string;
  due?: string;
};

export function NextStopPanel({ title, sub, time, due }: Props) {
  return (
    <Panel title="Next stop">
      <div className="flex flex-col gap-2">
        <h3 className="type-h3 m-0 text-ink">{title}</h3>
        <p className="type-body-s m-0 text-ink-2">{sub}</p>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
          <span className="type-mono-data text-xl font-bold text-ink">{time}</span>
          {due && <span className="type-label-m text-info">{due}</span>}
        </div>
      </div>
    </Panel>
  );
}
