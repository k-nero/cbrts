import { memo } from 'react';

import { COLOR_ERROR } from '@/constant/color';

const StarRed = memo(() => {
  return <span style={{ color: COLOR_ERROR, marginLeft: '3px' }}>*</span>;
});

StarRed.displayName = 'StarRed';

export default StarRed;
