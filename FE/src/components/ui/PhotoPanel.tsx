import type { CSSProperties, FC, ReactNode } from 'react';

import { cx } from './tone';

/** The scrim's navy (03-pages.js, NAVY), as r, g, b so each stop can set its own alpha. */
const NAVY = '11, 21, 36';

/** [position 0–1, alpha 0–1] */
export type ScrimStop = [number, number];

type Props = {
  /** The photograph. Drafts for now, to be replaced by licensed photographs. */
  src: string;
  /** What the photograph shows, for screen readers; omit when it is decoration. */
  alt?: string;
  /** The scrim under the text, from the side the text sits on. */
  scrim: ScrimStop[];
  /** 'to right' for copy on the left, 'to bottom' for copy along the foot. */
  direction?: 'to right' | 'to bottom';
  /** object-position of the photograph, so the subject stays in frame. */
  focus?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * A photograph as a panel (DESIGN.md, Photography; 03-pages.js, photoPanel). A photo is a material:
 * it reads the same in both themes, so the panel is always Dark, with a navy scrim under its text.
 */
export const PhotoPanel: FC<Props> = ({
  src,
  alt = '',
  scrim,
  direction = 'to right',
  focus = 'center',
  children,
  className,
  style,
}) => (
  <div
    data-theme="dark"
    className={cx('relative isolate overflow-hidden bg-sunken', className)}
    style={style}
  >
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className="absolute inset-0 -z-10 size-full object-cover"
      style={{ objectPosition: focus }}
    />
    <span
      aria-hidden
      className="absolute inset-0 -z-10"
      style={{
        background: `linear-gradient(${direction}, ${scrim
          .map(([at, alpha]) => `rgba(${NAVY}, ${alpha}) ${at * 100}%`)
          .join(', ')})`,
      }}
    />
    {children}
  </div>
);
