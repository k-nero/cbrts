import { FC } from 'react';

import { useRouterNavigation } from '@/router/route.hook';

const MARK = [
  'grid size-[30px] place-items-center rounded-[6px] bg-gold',
  'font-display text-[18px] text-gold-on italic',
].join(' ');

/**
 * The EquiFreight mark and wordmark, as the app header and staff sidebar show it. It always
 * opens the landing page, signed in or not (asking first when a form has unsaved changes).
 */
const Brand: FC = () => {
  const { push } = useRouterNavigation();
  return (
    <a
      href="/"
      aria-label="EquiFreight home"
      onClick={(e) => {
        e.preventDefault();
        push('/');
      }}
      className="flex cursor-pointer items-center gap-2.5 no-underline"
    >
      <span className={MARK}>Eq</span>
      <span className="font-display text-[18px] text-ink">EquiFreight</span>
    </a>
  );
};

export default Brand;
