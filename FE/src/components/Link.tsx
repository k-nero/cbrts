import { FC } from 'react';

export const Link: FC<{ children: string }> = ({ children }) => (
  <span className="cursor-default text-[13px] text-ink-2">{children}</span>
);
