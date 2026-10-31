import { memo } from 'react';

import { COLOR_ERROR } from '@/constant/color';

/** The required mark: a red star on screen, "required" to a screen reader. */
const StarRed = memo(() => {
  return (
    <>
      <span aria-hidden style={{ color: COLOR_ERROR, marginLeft: '3px' }}>
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
});

StarRed.displayName = 'StarRed';

export default StarRed;
