import { FC } from 'react';

const MARK = [
  'grid size-[30px] place-items-center rounded-md bg-gold',
  'font-display text-[18px] text-gold-on italic',
].join(' ');

/** The EquiFreight mark and wordmark, as the app header and staff sidebar show it. */
const Brand: FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0"
  >
    <span className={MARK}>Eq</span>
    <span className="font-display text-[18px] text-ink">EquiFreight</span>
  </button>
);

export default Brand;
