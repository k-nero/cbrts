import { FC } from 'react';

const AS_OF = '26 Sep 2026';

export const DemoNote: FC = () => (
  <span className="font-mono text-[12px] text-ink-3">Prototype · demo data as of {AS_OF}</span>
);
