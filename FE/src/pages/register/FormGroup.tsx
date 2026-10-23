import { Flex } from 'antd';
import { type FC, type ReactNode, useId } from 'react';

export const FormGroup: FC<{ title: string; children: ReactNode }> = ({ title, children }) => {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="border-t border-line pt-[18px]">
      <Flex vertical gap={14}>
        <h2 id={id} className="type-h4 m-0 text-ink">
          {title}
        </h2>
        {children}
      </Flex>
    </div>
  );
};
