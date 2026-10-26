import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'motion/react';

import ConfigWrapper from '@/HOC/ConfigWrapper';
import { router } from '@/router';

export default function App() {
  return (
    <ConfigWrapper>
      {/* Every animation honours the visitor's reduced-motion setting: fades stay, travel goes. */}
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </ConfigWrapper>
  );
}
