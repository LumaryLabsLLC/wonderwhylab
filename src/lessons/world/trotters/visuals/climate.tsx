import { useId } from 'react';
import type { ReactNode } from 'react';
import { C } from '../../../../lib/color';
import { continentOf, inPoly, LAND, landPaths, SEA } from './globe';
import type { ContinentId, Proj } from './globe';

/**
 * Climate zones, simplified but true: tropical between the tropics, polar near the poles,
 * temperate in between, and the big dry regions (deserts and dry grasslands) marked where they
 * really are. Used by the Climate Zones lesson.
 */

export type Zone = 'polar' | 'temperate' | 'dry' | 'tropical';

export const ZONE: Record<Zone, { name: string; color: string; weather: string }> = {
  polar: { name: 'Polar', color: '#f4f8fc', weather: 'Very cold. Long, dark winters and short, cool summers.' },
  temperate: { name: 'Temperate', color: '#c3e39a', weather: 'Four seasons: warm summers and cool or cold winters.' },
  dry: { name: 'Dry', color: '#f1c97a', weather: 'Very little rain all year. Many deserts have hot days and cold nights.' },
  tropical: { name: 'Tropical', color: '#3f9e5a', weather: 'Warm or hot all year. Many places get heavy rain.' },
};
export const ZONES: Zone[] = ['polar', 'temperate', 'dry', 'tropical'];
export const TROPIC = 23.5;

type LL = [number, number];

/** The world's big dry regions, roughly (deserts and dry grasslands). */
export const DRY: LL[][] = [
  // Sahara
  [[-17, 15.5], [-16.5, 27], [-9, 29.5], [-2, 32], [8, 33], [11, 31], [20, 30.5], [25, 30.5], [32, 29.5], [34, 27], [38, 18], [40, 15], [30, 14.5], [20, 14.5], [10, 15], [0, 15]],
  // Horn of Africa
  [[38, 8], [40, 12], [51, 12], [50, 6], [45, 2], [41, 3]],
  // Arabia, Iran and the Thar desert
  [[34, 30], [36, 33], [40, 36], [46, 36.5], [52, 36], [58, 37], [62, 36], [66, 32], [70, 30], [72, 26], [72, 24], [68, 22], [60, 22], [59, 20], [52, 15], [44, 12.5], [42, 16], [38, 22], [35, 27]],
  // Central Asia and the Gobi
  [[50, 47], [54, 44], [58, 37.5], [66, 37.5], [72, 38], [76, 40], [80, 37], [90, 37], [98, 38.5], [104, 38], [112, 42], [118, 44], [112, 46], [105, 47], [96, 46], [88, 48], [80, 49], [68, 48], [60, 49], [52, 49]],
  // South-west North America
  [[-120, 35], [-117, 38], [-112, 42], [-108, 42], [-104, 36], [-103, 30], [-100, 27], [-104, 23], [-110, 24], [-112, 27], [-115, 30], [-117, 32.5]],
  // Atacama and the dry Pacific coast of South America
  [[-81, -4], [-79, -8], [-76, -14], [-70.5, -18], [-70, -28], [-71, -30], [-69, -30], [-68, -22], [-69.5, -17], [-74, -12], [-79, -5]],
  // Patagonia
  [[-71, -38], [-63, -38], [-64, -42], [-65, -46], [-68, -50], [-70, -52], [-72, -50], [-71, -44]],
  // Kalahari and Namib
  [[11, -17], [18, -17], [24, -19], [27, -22], [26, -27], [22, -32], [18, -32], [15, -27], [13, -21]],
  // Inland Australia
  [[114, -21], [118, -19.5], [124, -17.8], [130, -17.5], [136, -18.5], [142, -20.5], [145.5, -24], [146, -28], [144, -33], [138.5, -33], [135, -35], [128, -34], [123.5, -35], [121, -31], [116, -28.5], [113, -24]],
];

/** Greenland's ice sheet counts as polar even south of the Arctic Circle. */
const GREENLAND = { lon: [-74, -30], lat: 59 };

export function zoneAt(lon: number, lat: number): Zone {
  const land = continentOf(lon, lat);
  if (lat >= 66.5 || lat <= -60 || land === 'antarctica') return 'polar';
  if (land && lon >= GREENLAND.lon[0] && lon <= GREENLAND.lon[1] && lat >= GREENLAND.lat) return 'polar';
  if (land && DRY.some((p) => inPoly([lon, lat], p))) return 'dry';
  return Math.abs(lat) < TROPIC ? 'tropical' : 'temperate';
}

type Life = [string, string][];

/** What lives and grows here: real examples for that zone on that continent. */
export function lifeAt(lon: number, lat: number): Life {
  const zone = zoneAt(lon, lat);
  const land: ContinentId | null = continentOf(lon, lat);
  if (zone === 'polar') {
    // Polar bears live on the sea ice, so they show up over the Arctic Ocean, not inland.
    if (lat > 0) return land ? [['🦌', 'reindeer'], ['🦊', 'Arctic foxes'], ['🦉', 'snowy owls'], ['🌿', 'mosses']] : [['🧊', 'sea ice'], ['🐻‍❄️', 'polar bears'], ['🦭', 'seals'], ['🐋', 'whales']];
    return [['🐧', 'penguins'], ['🦭', 'seals'], ['🐋', 'whales'], ['🧊', 'thick ice']];
  }
  if (!land) {
    if (zone === 'tropical') return [['🐠', 'reef fish'], ['🐢', 'sea turtles'], ['🐬', 'dolphins'], ['🦈', 'sharks']];
    return [['🐟', 'fish'], ['🐬', 'dolphins'], ['🐋', 'whales'], ['🦭', 'seals']];
  }
  if (zone === 'dry') {
    if (land === 'australia') return [['🦘', 'kangaroos'], ['🦎', 'lizards'], ['🌾', 'spinifex grass'], ['🐍', 'snakes']];
    if (land === 'northAmerica' || land === 'southAmerica') return [['🌵', 'cacti'], ['🦎', 'lizards'], ['🦂', 'scorpions'], ['🦅', 'hawks']];
    return [['🐪', 'camels'], ['🦎', 'lizards'], ['🦂', 'scorpions'], ['🌴', 'date palms']];
  }
  if (zone === 'tropical') {
    if (land === 'southAmerica') return [['🌳', 'rainforest'], ['🦥', 'sloths'], ['🦜', 'macaws'], ['🐸', 'tree frogs']];
    if (land === 'africa') return [['🌳', 'rainforest'], ['🦍', 'gorillas'], ['🐘', 'elephants'], ['🦒', 'giraffes']];
    if (land === 'asia') return [['🌳', 'rainforest'], ['🐘', 'elephants'], ['🐅', 'tigers'], ['🥭', 'mangoes']];
    if (land === 'australia') return [['🌳', 'rainforest'], ['🐊', 'crocodiles'], ['🦜', 'parrots'], ['🐸', 'frogs']];
    return [['🌳', 'rainforest'], ['🐒', 'monkeys'], ['🦜', 'parrots'], ['🐸', 'tree frogs']];
  }
  if (land === 'australia') return [['🐨', 'koalas'], ['🌿', 'gum trees'], ['🦜', 'cockatoos'], ['🐑', 'sheep farms']];
  return [['🍂', 'leafy trees'], ['🌾', 'farms'], ['🦊', 'foxes'], ['🦉', 'owls']];
}

/** Map coloured by climate zone. Children are drawn on top. */
export function ClimateMap({ pr, lines = true, children }: { pr: Proj; lines?: boolean; children?: ReactNode }) {
  const id = `clim${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const land = landPaths(pr);
  const band = (top: number, bottom: number, fill: string) => (
    <rect x={pr.X} y={pr.y(Math.min(top, pr.latTop))} width={pr.W} height={pr.y(Math.max(bottom, pr.latBottom)) - pr.y(Math.min(top, pr.latTop))} fill={fill} />
  );
  const poly = (p: LL[]) => `M${p.map(([lo, la]) => `${pr.x(lo).toFixed(1)},${pr.y(la).toFixed(1)}`).join(' L')} Z`;
  return (
    <g>
      <defs>
        <clipPath id={`${id}m`}>
          <rect x={pr.X} y={pr.Y} width={pr.W} height={pr.H} rx={10} />
        </clipPath>
        <clipPath id={`${id}l`}>
          {land.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </clipPath>
      </defs>
      <rect x={pr.X} y={pr.Y} width={pr.W} height={pr.H} rx={10} fill={SEA} />
      <g clipPath={`url(#${id}m)`}>
        <g clipPath={`url(#${id}l)`}>
          <rect x={pr.X} y={pr.Y} width={pr.W} height={pr.H} fill={LAND} />
          {band(90, 66.5, ZONE.polar.color)}
          {band(66.5, TROPIC, ZONE.temperate.color)}
          {band(TROPIC, -TROPIC, ZONE.tropical.color)}
          {band(-TROPIC, -60, ZONE.temperate.color)}
          {band(-60, -90, ZONE.polar.color)}
          <rect x={pr.x(GREENLAND.lon[0])} y={pr.y(84)} width={pr.x(GREENLAND.lon[1]) - pr.x(GREENLAND.lon[0])} height={pr.y(GREENLAND.lat) - pr.y(84)} fill={ZONE.polar.color} />
          {DRY.map((p, i) => (
            <path key={i} d={poly(p)} fill={ZONE.dry.color} />
          ))}
        </g>
        {land.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={C.ink} strokeOpacity={0.55} strokeWidth={1} strokeLinejoin="round" />
        ))}
        {lines && (
          <g pointerEvents="none">
            <line x1={pr.X} x2={pr.X + pr.W} y1={pr.y(0)} y2={pr.y(0)} stroke={C.ink} strokeWidth={2} strokeDasharray="10 6" />
            {[TROPIC, -TROPIC].map((t) => (
              <line key={t} x1={pr.X} x2={pr.X + pr.W} y1={pr.y(t)} y2={pr.y(t)} stroke={C.ink} strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="4 6" />
            ))}
          </g>
        )}
        {children}
      </g>
      <rect x={pr.X} y={pr.Y} width={pr.W} height={pr.H} rx={10} fill="none" stroke={C.ink} strokeWidth={2} />
    </g>
  );
}
