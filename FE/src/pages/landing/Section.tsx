import { Flex } from 'antd';
import { motion } from 'motion/react';
import type { FC, ReactNode } from 'react';

import { IN_VIEW, rise, stagger } from '@/lib/motion';

/* The header rises first, then the body; children may stagger their own items on the same cue. */
export const Section: FC<{ id: string; title: string; summary?: string; children: ReactNode }> = ({
  id,
  title,
  summary,
  children,
}) => (
  <motion.section
    aria-labelledby={id}
    className="scroll-mt-6 pt-20"
    variants={stagger(0.1)}
    initial="hidden"
    whileInView="shown"
    viewport={IN_VIEW}
  >
    <Flex vertical gap={32}>
      <motion.header variants={rise} className="flex flex-col gap-2.5">
        <h2 id={id} className="type-display-m md:type-display-l m-0 text-ink">
          {title}
        </h2>
        {summary && <p className="type-body-m m-0 max-w-[680px] text-ink-2">{summary}</p>}
      </motion.header>
      <motion.div variants={rise}>{children}</motion.div>
    </Flex>
  </motion.section>
);
