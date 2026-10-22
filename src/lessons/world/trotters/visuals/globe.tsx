import type { ReactNode } from 'react';
import { C, shade } from '../../../../lib/color';
import { CONTINENT_FILL, CONTINENT_IDS, CONTINENT_NAME, CONTINENTS, continentAt, polyPath, SEA } from '../../wanderers/visuals/world';
import type { ContinentId } from '../../wanderers/visuals/world';

/**
 * A world map for the 8–12 World lessons, built on the shared continent outlines in
 * wanderers/visuals/world.tsx. Equirectangular: longitude → x, latitude → y, so the
 * lines of latitude and longitude are straight and evenly spaced. The map can be
 * cropped to any band of latitudes.
 */

export type { ContinentId };
export { SEA, CONTINENT_NAME };
export const LAND = '#e9e0c9';

export interface Proj {
  /** Top-left of the map in scene units. */
  X: number;
  Y: number;
  W: number;
  H: number;
  latTop: number;
  latBottom: number;
  x: (lon: number) => number;
  y: (lat: number) => number;
  lon: (x: number) => number;
  lat: (y: number) => number;
}

export function geoProj(X: number, Y: number, W: number, latTop = 84, latBottom = -62, lonLeft = -180, lonRight = 180): Proj {
  const span = lonRight - lonLeft;
  const H = (W * (latTop - latBottom)) / span;
  return {
    X,
    Y,
    W,
    H,
    latTop,
    latBottom,
    x: (lon) => X + ((lon - lonLeft) / span) * W,
    y: (lat) => Y + ((latTop - lat) / (latTop - latBottom)) * H,
    lon: (x) => ((x - X) / W) * span + lonLeft,
    lat: (y) => latTop - ((y - Y) / H) * (latTop - latBottom),
  };
}

/** Path for one continent outline in this projection. */
const path = (poly: [number, number][], pr: Proj) => polyPath(poly, pr);

/** Every land outline as SVG path data (handy for clip paths). */
export function landPaths(pr: Proj): string[] {
  return CONTINENT_IDS.flatMap((id) => CONTINENTS[id].map((poly) => path(poly, pr)));
}

export function WorldMap({
  pr,
  id,
  colours = false,
  fill,
  stroke = 1.2,
  frame = true,
  children,
}: {
  pr: Proj;
  /** Unique id for the clip path. */
  id: string;
  /** Colour each continent differently (otherwise plain land). */
  colours?: boolean;
  /** Custom land fill per continent. */
  fill?: (c: ContinentId) => string;
  stroke?: number;
  frame?: boolean;
  /** Drawn above the land, clipped to the map. */
  children?: ReactNode;
}) {
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={pr.X} y={pr.Y} width={pr.W} height={pr.H} rx={10} />
        </clipPath>
      </defs>
      <rect x={pr.X} y={pr.Y} width={pr.W} height={pr.H} rx={10} fill={SEA} />
      <g clipPath={`url(#${id})`}>
        {CONTINENT_IDS.map((c) =>
          CONTINENTS[c].map((poly, i) => (
            <path
              key={`${c}${i}`}
              d={path(poly, pr)}
              fill={fill ? fill(c) : colours ? CONTINENT_FILL[c] : LAND}
              stroke={shade(C.ink, 0.25)}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
          )),
        )}
        {children}
      </g>
      {frame && <rect x={pr.X} y={pr.Y} width={pr.W} height={pr.H} rx={10} fill="none" stroke={C.ink} strokeWidth={2} />}
    </g>
  );
}

/** "34° N", "0°", "118° W"… from a signed latitude or longitude. */
export function degLabel(v: number, kind: 'lat' | 'lon') {
  const n = Math.round(Math.abs(v));
  if (n === 0) return '0°';
  const dir = kind === 'lat' ? (v > 0 ? 'N' : 'S') : v > 0 ? 'E' : 'W';
  return `${n}° ${dir}`;
}

/** Is the point inside the polygon? (Both as [longitude, latitude].) */
export function inPoly([px, py]: [number, number], poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Which continent covers this point, if any. */
export const continentOf = (lon: number, lat: number) => continentAt([lon, lat]);
