import { RouterProvider } from 'react-router-dom';

import ConfigWrapper from '@/HOC/ConfigWrapper';
import { router } from '@/router';

export default function App() {
  return (
    <ConfigWrapper>
      <RouterProvider router={router} />
    </ConfigWrapper>
  );
}
