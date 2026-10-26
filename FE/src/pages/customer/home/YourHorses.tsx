import { type FC } from 'react';
import { Flex } from 'antd';
import { motion } from 'motion/react';

import { Button, COAT_SWATCH, cx, Panel, TONE_FG } from '@/components/ui';
import type { CustomerHome } from '@/interfaces';
import { settle, stagger } from '@/lib/motion';

/* ---------- your horses ---------- */

/** Coat swatch, name and breed line, documents cleared, and the one thing a horse waits on. */
export const YourHorses: FC<{ home: CustomerHome; onAll: () => void; onAdd: () => void }> = ({
  home,
  onAll,
  onAdd,
}) => (
  <Panel
    title={
      <Flex vertical gap={2}>
        <h2 className="type-h4 m-0 text-ink">Your horses</h2>
        <p className="type-body-s m-0 text-ink-3">{home.horsesNote}</p>
      </Flex>
    }
    className="self-start"
  >
    {home.horses.length === 0 && (
      <Flex vertical align="start" gap={12} className="border-t border-line py-4">
        <p className="type-body-s m-0 text-ink-2">
          Add each horse once; every request then picks from them.
        </p>
        <Button size="sm" variant="secondary" leadingIcon="plus" onClick={onAdd}>
          Add a horse
        </Button>
      </Flex>
    )}
    <motion.ul
      className="m-0 -mt-1 list-none p-0"
      variants={stagger(0.05, 0.2)}
      initial="hidden"
      animate="shown"
    >
      {home.horses.map((h) => (
        <motion.li key={h.id} variants={settle} className="border-t border-line py-3">
          <Flex align="center" gap={12}>
            <span
              aria-hidden
              className={cx(
                'size-3 shrink-0 rounded-full border border-line-strong',
                COAT_SWATCH[h.coat],
              )}
            />
            <Flex component="span" vertical gap={2} className="min-w-0 flex-1">
              <span className="type-label-m text-ink">{h.name}</span>
              <span className="type-body-s text-ink-3">{h.line}</span>
            </Flex>
            <Flex component="span" vertical align="end" gap={2} className="shrink-0 text-right">
              <span className="type-caption text-ink-2">{h.documents}</span>
              {h.note && (
                <span className={cx('type-body-s', TONE_FG[h.note.tone])}>{h.note.text}</span>
              )}
            </Flex>
          </Flex>
        </motion.li>
      ))}
    </motion.ul>
    <div className="pt-1">
      <Button size="sm" variant="ghost" trailingIcon="arrow-right" onClick={onAll}>
        My horses
      </Button>
    </div>
  </Panel>
);
