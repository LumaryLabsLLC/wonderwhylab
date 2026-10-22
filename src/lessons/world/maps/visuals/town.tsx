import { C, shade } from '../../../../lib/color';
import { EMOJI_FONT } from '../../../../games/reading/words';

/** Places in a town, what they look like and what they are for (true, simple words). */
export type PlaceId = 'school' | 'park' | 'shop' | 'library' | 'hospital' | 'home';

export const PLACES: Record<PlaceId, { emoji: string; name: string; info: string }> = {
  school: { emoji: '🏫', name: 'school', info: 'Children learn and play here, with their teachers.' },
  park: { emoji: '🌳', name: 'park', info: 'A green place to play, run and enjoy the trees.' },
  shop: { emoji: '🏪', name: 'shop', info: 'People buy food and things they need here.' },
  library: { emoji: '📚', name: 'library', info: 'You can borrow books here and bring them back later.' },
  hospital: { emoji: '🏥', name: 'hospital', info: 'Doctors and nurses help people who are sick or hurt.' },
  home: { emoji: '🏠', name: 'home', info: 'People live here. Homes can be houses or flats.' },
};

export const ROAD = '#c9ccd6';
export const LOT = shade(C.green, 0.55);

/**
 * A little town map for practice questions: `cols` × `rows` blocks with roads between them.
 * `lots[r][c]` is the emoji on each block. `path` is a list of road points in node units
 * (x from 0 to 2·cols, y from 0 to 2·rows; even numbers are roads).
 */
export function MiniTown({ lots, path, label }: { lots: string[][]; path?: [number, number][]; label: string }) {
  const rows = lots.length;
  const cols = lots[0].length;
  const B = 90; // block pitch
  const R = 22; // road width
  const W = cols * B + R;
  const H = rows * B + R;
  const nx = (i: number) => R / 2 + (i * B) / 2;
  const last = path?.[path.length - 1];
  const prev = path?.[path.length - 2];
  return (
    <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} role="img" aria-label={label}>
      <rect x={0} y={0} width={W} height={H} rx={8} fill={ROAD} stroke={C.ink} strokeWidth={2.5} />
      {lots.map((row, r) =>
        row.map((e, c) => (
          <g key={`${r}-${c}`}>
            <rect x={R + c * B} y={R + r * B} width={B - R} height={B - R} rx={6} fill={LOT} stroke={C.ink} strokeWidth={1.5} />
            <rect x={R / 2 + (c + 0.5) * B - 7} y={(r + 1) * B - 9} width={14} height={9} fill={C.brown} stroke={C.ink} strokeWidth={1.5} />
            <text x={R / 2 + (c + 0.5) * B} y={R / 2 + (r + 0.5) * B} textAnchor="middle" dominantBaseline="central" fontSize={40} fontFamily={EMOJI_FONT}>
              {e}
            </text>
          </g>
        )),
      )}
      {path && last && prev && (
        <g>
          <polyline points={path.map(([x, y]) => `${nx(x)},${nx(y)}`).join(' ')} fill="none" stroke={C.red} strokeWidth={5} strokeDasharray="9 7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={nx(path[0][0])} cy={nx(path[0][1])} r={7} fill={C.red} stroke={C.ink} strokeWidth={2} />
          <Arrow from={[nx(prev[0]), nx(prev[1])]} to={[nx(last[0]), nx(last[1])]} />
        </g>
      )}
    </svg>
  );
}

function Arrow({ from, to }: { from: [number, number]; to: [number, number] }) {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const s = 13;
  const p = (da: number) => `${to[0] - s * Math.cos(a + da)},${to[1] - s * Math.sin(a + da)}`;
  return <polygon points={`${to[0]},${to[1]} ${p(0.5)} ${p(-0.5)}`} fill={C.red} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />;
}
