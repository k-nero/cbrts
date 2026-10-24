/** "$412.8k", "$950", "$1.2m": a chart figure, short. */
export const compactMoney = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
};

/** "Oct", or "Oct 2026" when asked: a YYYY-MM month in words. */
export const monthLabel = (ym: string, withYear = false) => {
  const [y, m] = ym.split('-').map(Number);
  const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  });
  return withYear ? `${name} ${y}` : name;
};
