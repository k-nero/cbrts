import { Panel } from '@/components/ui';

type Props = {
  text: string;
};

export function WhatCustomerSeesPanel({ text }: Props) {
  return (
    <Panel title="What the customer sees">
      <p className="type-body-s m-0 text-ink-2">{text}</p>
    </Panel>
  );
}
