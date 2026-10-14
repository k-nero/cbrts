import type { FC } from 'react';

import { cx, Icon } from '@/components/ui';

/*
 * Where we move horses (docs/figma-plugin/src/03-pages.js, routeMap and routeMapRow). Drawn like
 * a transit map, not a survey map: positions follow longitude and latitude, but the empty sea east
 * of 107°E is squeezed so the six countries get the room. Roads are solid, air is dashed, and each
 * border crossing is a gate on its road.
 */

const W = 760;
const H = 560;
const mx = (lon: number) => (lon <= 107 ? 40 + (lon - 99.5) * 62 : 505 + (lon - 107) * 28);
const my = (lat: number) => 30 + (23 - lat) * 24.4;

/* Label side: r right, l left, la left and above (where a road leaves to the right or below). */
type Side = 'r' | 'l' | 'la';
const CITIES: { code: string; name: string; lon: number; lat: number; side: Side }[] = [
  { code: 'HCM', name: 'Ho Chi Minh City', lon: 106.7, lat: 10.8, side: 'r' },
  { code: 'PNH', name: 'Phnom Penh', lon: 104.9, lat: 11.6, side: 'l' },
  { code: 'BKK', name: 'Bangkok', lon: 100.5, lat: 13.8, side: 'la' },
  { code: 'VTE', name: 'Vientiane', lon: 102.6, lat: 17.97, side: 'l' },
  { code: 'HAN', name: 'Hanoi', lon: 105.8, lat: 21.0, side: 'r' },
  { code: 'KUL', name: 'Kuala Lumpur', lon: 101.7, lat: 3.1, side: 'r' },
  { code: 'HKG', name: 'Hong Kong', lon: 114.2, lat: 22.3, side: 'la' },
];

/* [from, to, crossing, gate lon, gate lat, label offset from the gate] */
const ROADS: [string, string, string, number, number, [number, number]][] = [
  ['HCM', 'PNH', 'Mộc Bài – Bavet', 105.8, 11.2, [-96, 16]],
  ['PNH', 'BKK', 'Poipet – Aranyaprathet', 102.55, 13.65, [-74, -28]],
  ['BKK', 'VTE', 'Nong Khai – Vientiane', 102.18, 17.14, [16, -2]],
  ['BKK', 'KUL', 'Sadao – Bukit Kayu Hitam', 100.45, 6.55, [16, -8]],
  ['HAN', 'VTE', 'Cầu Treo – Nam Phao', 105.1, 18.4, [16, -6]],
];

/* [from, control lon, control lat]: every air leg lands in Hong Kong */
const AIR: [string, number, number][] = [
  ['HCM', 112, 12],
  ['PNH', 110, 16],
];

const AREAS: [string, number, number][] = [
  ['VIETNAM', 106.3, 14.6],
  ['CAMBODIA', 104.5, 13.2],
  ['THAILAND', 101.3, 19.3],
  ['LAOS', 104, 19.8],
  ['MALAYSIA', 102.8, 4.8],
  ['Gulf of Thailand', 101.8, 9.5],
  ['South China Sea', 111.5, 9],
];

const at = (code: string): [number, number] => {
  const c = CITIES.find((x) => x.code === code);
  return c ? [mx(c.lon), my(c.lat)] : [0, 0];
};

const range = (step: number, end: number) =>
  Array.from({ length: Math.ceil(end / step) - 1 }, (_, i) => (i + 1) * step);

/** The six countries, the five road corridors with their border gates, and the air legs. */
export const RouteMap: FC = () => {
  const roads = ROADS.map(([from, to, , lon, lat]) => {
    const [ax, ay] = at(from);
    const [bx, by] = at(to);
    return `M${ax} ${ay} L${mx(lon)} ${my(lat)} L${bx} ${by}`;
  });
  const [hx, hy] = at('HKG');
  const air = AIR.map(([from, lon, lat]) => {
    const [ax, ay] = at(from);
    return `M${ax} ${ay} Q${mx(lon)} ${my(lat)} ${hx} ${hy}`;
  });

  return (
    <figure
      aria-label="Map: road corridors between Vietnam, Cambodia, Thailand, Laos and Malaysia, and air to Hong Kong"
      className="relative m-0 shrink-0 overflow-hidden rounded-lg bg-sunken"
      style={{ width: W, height: H }}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        fill="none"
        className="absolute inset-0"
        aria-hidden
      >
        <g className="stroke-line" strokeOpacity={0.6}>
          {range(76, W).map((x) => (
            <line key={`x${x}`} x1={x + 0.5} y1={0} x2={x + 0.5} y2={H} />
          ))}
          {range(70, H).map((y) => (
            <line key={`y${y}`} x1={0} y1={y + 0.5} x2={W} y2={y + 0.5} />
          ))}
        </g>
        <g className="stroke-ink-3" strokeWidth={2} strokeDasharray="6 6" strokeLinecap="round">
          {air.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g className="stroke-ink" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          {roads.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>

      {AREAS.map(([label, lon, lat]) => {
        const sea = label !== label.toUpperCase();
        return (
          <span
            key={label}
            aria-hidden
            className={cx(
              'absolute -translate-1/2 whitespace-nowrap text-ink-3',
              sea ? 'type-body-s italic' : 'type-mono-label',
            )}
            style={{
              left: mx(lon),
              top: my(lat),
              fontFamily: sea ? 'var(--font-display)' : undefined,
            }}
          >
            {label}
          </span>
        );
      })}

      {ROADS.map(([, , crossing, lon, lat, [dx, dy]]) => (
        <span key={crossing} aria-hidden>
          <span
            className="absolute grid size-5 place-items-center rounded-full border-[1.5px] border-ink bg-card text-ink"
            style={{ left: mx(lon) - 10, top: my(lat) - 10 }}
          >
            <Icon name="flag" size={11} />
          </span>
          <span
            className="type-caption absolute whitespace-nowrap text-ink-2"
            style={{ left: mx(lon) + dx, top: my(lat) + dy }}
          >
            {crossing}
          </span>
        </span>
      ))}

      {CITIES.map((c) => {
        const x = mx(c.lon);
        const y = my(c.lat);
        const right = c.side === 'r';
        return (
          <span key={c.code} aria-hidden>
            <span
              className="absolute box-border size-3.5 rounded-full border-[3px] border-ink bg-card"
              style={{ left: x - 7, top: y - 7 }}
            />
            <span
              className={cx(
                'absolute flex flex-col whitespace-nowrap',
                right ? 'items-start' : '-translate-x-full items-end text-right',
              )}
              style={{
                left: right ? x + 12 : c.side === 'l' ? x - 12 : x + 8,
                top: c.side === 'la' ? y - 44 : y - 10,
              }}
            >
              <span className="type-label-s text-ink">{c.name}</span>
              <span className="type-caption text-ink-3">{c.code}</span>
            </span>
          </span>
        );
      })}
    </figure>
  );
};

const CORRIDORS: [string, string][] = [
  ['Ho Chi Minh City → Phnom Penh', 'Road · Mộc Bài – Bavet'],
  ['Phnom Penh → Bangkok', 'Road · Poipet – Aranyaprathet'],
  ['Bangkok → Vientiane', 'Road · Nong Khai – Vientiane'],
  ['Bangkok → Kuala Lumpur', 'Road · Sadao – Bukit Kayu Hitam'],
  ['Hanoi → Vientiane', 'Road · Cầu Treo – Nam Phao'],
  ['Ho Chi Minh City, Phnom Penh → Hong Kong', 'Air · Economy, Business, First stalls'],
];

/** The map's key: each corridor with its line, solid for road and dashed for air. */
export const Corridors: FC = () => (
  <section
    aria-labelledby="corridors-title"
    className="min-w-0 flex-1 rounded-lg border border-line bg-card px-6 pt-5 pb-3"
  >
    <header className="flex flex-col gap-1 pb-3.5">
      <h3 id="corridors-title" className="type-h4 m-0 text-ink">
        Corridors we run
      </h3>
      <p className="type-body-s m-0 max-w-[360px] text-ink-3">
        Each road corridor crosses at one border post. Air goes through Hong Kong.
      </p>
    </header>
    <ul className="m-0 list-none p-0">
      {CORRIDORS.map(([route, how]) => {
        const air = how.startsWith('Air');
        return (
          <li key={route} className="flex items-center gap-3 border-t border-line py-2.5">
            <span className="flex h-3 w-7 shrink-0 items-center" aria-hidden>
              <span
                className={cx('w-full', air ? 'h-0.5' : 'h-[3px] bg-ink')}
                style={
                  air
                    ? {
                        background:
                          'repeating-linear-gradient(to right, var(--color-ink-3) 0 6px, transparent 6px 12px)',
                      }
                    : undefined
                }
              />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="type-label-s text-ink">{route}</span>
              <span className="type-body-s text-ink-3">{how}</span>
            </span>
          </li>
        );
      })}
    </ul>
  </section>
);
