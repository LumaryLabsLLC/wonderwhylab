import { useState } from 'react';
import { CloudRain, Mountain, Waves } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { clamp, useSvgDrag } from '../../../lib/svg';
import type { Pt } from '../../../lib/svg';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { Draggable, mcq, Note, others } from '../maps/visuals/kit';
import { FORM_INFO, FORM_NAME, FormPic } from './visuals/landforms';
import type { FormId } from './visuals/landforms';

const SKY = '#e3f2ff';
const GRASS = shade(C.green, 0.3);
const WATER = shade(C.blue, 0.3);
const ROCK = shade(C.purple, 0.3);

// Gentle motion for rain and flowing water; switched off for people who prefer less motion.
const MOTION_CSS = `
@keyframes wy-flow { to { stroke-dashoffset: -36; } }
@keyframes wy-rain { from { transform: translateY(-14px); opacity: 0; } 40% { opacity: 1; } to { transform: translateY(30px); opacity: 0; } }
.wy-flow { animation: wy-flow 0.9s linear infinite; }
.wy-rain { animation: wy-rain 1.1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .wy-flow, .wy-rain { animation: none; } }
`;

// ── "Name it": a landscape poster ────────────────────────────────────────────
const RIVER_PTS: [number, number][] = [
  [265, 232],
  [262, 262],
  [290, 300],
  [330, 330],
  [380, 350],
  [430, 344],
  [470, 352],
];
const RIVER_D = `M${RIVER_PTS.map((p) => p.join(',')).join(' L')}`;
const SEA_D = 'M480,296 L690,296 L690,520 L440,520 C452,480 462,452 470,440 L505,418 L600,412 Q616,398 600,385 L500,380 C478,372 468,360 470,350 C472,330 476,310 480,296 Z';

function distToPolyline(p: Pt, pts: [number, number][]) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const t = clamp(((p.x - ax) * (bx - ax) + (p.y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2), 0, 1);
    best = Math.min(best, Math.hypot(p.x - (ax + t * (bx - ax)), p.y - (ay + t * (by - ay))));
  }
  return best;
}

/** Which landform is at this point of the poster? Checked from small features to big ones. */
function formAt(p: Pt): FormId | 'sea' | null {
  const inEllipse = (cx: number, cy: number, rx: number, ry: number) => ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2 <= 1;
  if (inEllipse(630, 470, 50, 32)) return 'island';
  if (p.x >= 494 && p.x <= 622 && p.y >= 372 && p.y <= 426) return 'peninsula';
  if (inEllipse(150, 420, 72, 38)) return 'lake';
  if (Math.hypot(p.x - 265, p.y - 210) < 36) return 'valley';
  if (distToPolyline(p, RIVER_PTS) < 22) return 'river';
  if (Math.hypot(p.x - 170, p.y - 170) < 66 || Math.hypot(p.x - 360, p.y - 180) < 60) return 'mountain';
  if (Math.hypot(p.x - 552, p.y - 236) < 56) return 'hill';
  if (p.x >= 30 && p.x <= 470 && p.y >= 318 && p.y <= 520) return 'plain';
  if (p.x >= 470 && p.x <= 690 && p.y >= 296 && p.y <= 520) return 'sea';
  return null;
}

const TAG_AT: Record<FormId, [number, number]> = {
  mountain: [170, 88],
  valley: [265, 186],
  hill: [552, 190],
  river: [372, 378],
  lake: [150, 420],
  plain: [300, 476],
  island: [630, 438],
  peninsula: [596, 352],
};
const NAME_IDS: FormId[] = ['mountain', 'hill', 'valley', 'plain', 'river', 'lake', 'island', 'peninsula'];

const CLUE: Record<FormId, string> = {
  mountain: 'Look for the highest, steepest land with a pointed top.',
  hill: 'Look for land that rises up but is lower and rounder than the mountains.',
  valley: 'Look for the low “V” between the two mountains, where the river starts.',
  plain: 'Look for the wide, flat green land.',
  river: 'Look for the blue line of water flowing to the sea.',
  lake: 'Look for water with land all around it.',
  island: 'Look for land in the sea with water all around it.',
  peninsula: 'Look for land that sticks out into the sea, with water on three sides.',
};

function Tag({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 9.4 + 22;
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - 15} width={w} height={30} rx={15} fill={C.white} stroke={C.ink} strokeWidth={2} />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
        {text}
      </text>
    </g>
  );
}

function Poster({ rain }: { rain: boolean }) {
  return (
    <g>
      <rect x={30} y={64} width={660} height={456} fill={SKY} />
      {/* Back: two mountains with a valley between them, and a hill */}
      <path d="M30,300 L170,110 L265,232 L360,124 L466,258 Q552,168 640,266 L690,272 L690,300 L30,300 Z" fill={ROCK} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <path d="M454,300 L466,258 Q552,168 640,266 L690,272 L690,300 Z" fill={GRASS} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <path d="M134,159 L170,110 L206,156 L190,150 L178,162 L162,150 L150,162 Z" fill={C.white} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <path d="M328,164 L360,124 L392,164 L378,158 L366,170 L352,158 L340,170 Z" fill={C.white} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      {/* Front: the plain, the sea with a peninsula and an island, a lake and a river */}
      <rect x={30} y={296} width={660} height={224} fill={GRASS} />
      <path d="M30,300 L170,110 L265,232 L360,124 L466,258 L470,300" fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" opacity={0.25} />
      <path d={SEA_D} fill={WATER} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx={630} cy={470} rx={38} ry={20} fill={GRASS} stroke={C.ink} strokeWidth={2} />
      <ellipse cx={150} cy={420} rx={62} ry={28} fill={WATER} stroke={C.ink} strokeWidth={2} />
      <path d={RIVER_D} fill="none" stroke={C.ink} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
      <path d={RIVER_D} fill="none" stroke={WATER} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      {rain && (
        <g>
          <path d={RIVER_D} fill="none" stroke={C.white} strokeWidth={3} strokeDasharray="6 12" strokeLinecap="round" className="wy-flow" />
          {[
            [170, 160, 260, 230],
            [360, 166, 270, 232],
          ].map(([x1, y1, x2, y2], i) => (
            <path key={i} d={`M${x1},${y1} Q${(x1 + x2) / 2},${y2 - 10} ${x2},${y2}`} fill="none" stroke={WATER} strokeWidth={4} strokeDasharray="6 12" className="wy-flow" />
          ))}
          {Array.from({ length: 22 }, (_, i) => (
            <line
              key={i}
              x1={60 + i * 20}
              y1={70 + (i % 4) * 14}
              x2={56 + i * 20}
              y2={82 + (i % 4) * 14}
              stroke={shade(C.blue, -0.1)}
              strokeWidth={2.5}
              strokeLinecap="round"
              className="wy-rain"
              style={{ animationDelay: `${(i % 5) * 0.2}s` }}
            />
          ))}
        </g>
      )}
      <rect x={30} y={64} width={660} height={456} rx={12} fill="none" stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

// ── "Shape it": a side view (cross-section) with draggable heights ──────────
const N = 9;
const XS = Array.from({ length: N }, (_, i) => 70 + i * 72.5);
const BASE = 520;
const SEA_H = 120; // sea level, as a height above the bottom
const SNOW_H = 270;
const START_H = [230, 215, 200, 185, 170, 155, 140, 90, 60];

type Label = 'mountain' | 'hill' | 'valley' | 'plain' | 'island';
const GOALS: Label[] = ['mountain', 'hill', 'valley', 'plain', 'island'];

/** Name the features of a side-view profile. */
function classify(h: number[]): (Label | null)[] {
  const out: (Label | null)[] = Array(h.length).fill(null);
  const above = h.map((v) => v > SEA_H + 4);
  const taken = Array(h.length).fill(false);
  // Islands: land with sea on both sides.
  for (let i = 0; i < h.length; ) {
    if (!above[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < h.length && above[j + 1]) j++;
    if (i > 0 && j < h.length - 1) {
      let top = i;
      for (let k = i; k <= j; k++) {
        if (h[k] > h[top]) top = k;
        taken[k] = true;
      }
      out[top] = 'island';
    }
    i = j + 1;
  }
  // Plains: at least three points in a row, flat and not very high.
  for (let i = 0; i + 2 < h.length; i++) {
    const run = [h[i], h[i + 1], h[i + 2]];
    if (run.every((v, k) => above[i + k] && !taken[i + k] && v - SEA_H < 130) && Math.max(...run) - Math.min(...run) <= 24) {
      let j = i + 2;
      while (j + 1 < h.length && above[j + 1] && !taken[j + 1] && Math.abs(h[j + 1] - h[i]) <= 24) j++;
      for (let k = i; k <= j; k++) taken[k] = true;
      out[Math.floor((i + j) / 2)] = 'plain';
      i = j;
    }
  }
  for (let i = 1; i < h.length - 1; i++) {
    if (taken[i] || !above[i]) continue;
    const [l, r] = [h[i - 1], h[i + 1]];
    if (h[i] >= l && h[i] >= r && (h[i] > l || h[i] > r)) {
      const alt = h[i] - SEA_H;
      out[i] = alt >= 150 ? 'mountain' : alt >= 45 ? 'hill' : null;
    } else if (h[i] < l - 25 && h[i] < r - 25) out[i] = 'valley';
  }
  return out;
}

/** Where water goes when it rains on point i: downhill one way (dir = -1 left, +1 right) until it cannot go lower. */
function runoff(h: number[], i: number, dir: -1 | 1) {
  const path = [i];
  let k = i;
  while (k + dir >= 0 && k + dir < h.length && h[k + dir] < h[k]) {
    k += dir;
    path.push(k);
    if (h[k] <= SEA_H) break;
  }
  return path;
}

/** Bézier control points for a smooth curve through points (Catmull-Rom), one segment at a time. */
function segment(pts: [number, number][], i: number) {
  const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
  const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
  const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  return [p1, c1, c2, p2] as const;
}

function smoothProfile(pts: [number, number][]) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [, c1, c2, p2] = segment(pts, i);
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Points along the drawn curve from handle a to the next handle b (b = a ± 1). */
function along(pts: [number, number][], a: number, b: number) {
  const seg = Math.min(a, b) + 1; // pts has an extra point at the left edge
  const [p1, c1, c2, p2] = segment(pts, seg);
  const out: [number, number][] = [];
  for (let n = 0; n <= 8; n++) {
    const t = a < b ? n / 8 : 1 - n / 8;
    const u = 1 - t;
    out.push([
      u ** 3 * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p2[0],
      u ** 3 * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p2[1],
    ]);
  }
  return out;
}

function Handle({ i, h, onChange }: { i: number; h: number; onChange: (i: number, h: number) => void }) {
  const drag = useSvgDrag((p) => onChange(i, clamp(BASE - p.y, 12, 380)));
  return (
    <g {...drag} role="slider" aria-label={`Height of point ${i + 1}`} aria-valuenow={Math.round(h)} style={{ ...drag.style, cursor: 'ns-resize' }}>
      <circle cx={XS[i]} cy={BASE - h} r={28} fill="transparent" />
      <circle cx={XS[i]} cy={BASE - h} r={13} fill={C.white} stroke={C.ink} strokeWidth={3} />
      <path d={`M${XS[i]},${BASE - h - 7} v14 M${XS[i] - 4},${BASE - h - 3} l4,-4 l4,4 M${XS[i] - 4},${BASE - h + 3} l4,4 l4,-4`} stroke={C.ink} strokeWidth={1.8} fill="none" />
    </g>
  );
}

function Profile({ h, rain }: { h: number[]; rain: boolean }) {
  const pts: [number, number][] = [[30, BASE - h[0]], ...XS.map((x, i) => [x, BASE - h[i]] as [number, number]), [690, BASE - h[N - 1]]];
  const top = smoothProfile(pts);
  const land = `${top} L690,${BASE} L30,${BASE} Z`;
  const labels = classify(h);
  const peaks = labels.map((l, i) => (l === 'mountain' || l === 'hill' || l === 'island' ? i : -1)).filter((i) => i >= 0);
  return (
    <g>
      <clipPath id="wy-snow">
        <rect x={30} y={64} width={660} height={BASE - SNOW_H - 64} />
      </clipPath>
      <rect x={30} y={64} width={660} height={456} fill={SKY} />
      <rect x={30} y={BASE - SEA_H} width={660} height={SEA_H} fill={WATER} />
      <path d={land} fill={shade(C.brown, 0.35)} stroke={C.ink} strokeWidth={2} />
      <path d={top} fill="none" stroke={shade(C.green, -0.05)} strokeWidth={7} strokeLinecap="round" />
      <path d={land} fill={C.white} clipPath="url(#wy-snow)" stroke={C.ink} strokeWidth={2} />
      <line x1={30} y1={BASE - SEA_H} x2={690} y2={BASE - SEA_H} stroke={shade(C.blue, -0.3)} strokeWidth={1.5} strokeDasharray="8 6" />
      <text x={40} y={BASE - SEA_H + 22} fontSize={15} fill={shade(C.blue, -0.5)}>
        sea level
      </text>
      <line x1={30} y1={BASE - SNOW_H} x2={690} y2={BASE - SNOW_H} stroke={C.muted} strokeWidth={1} strokeDasharray="3 6" />
      <text x={680} y={BASE - SNOW_H - 6} textAnchor="end" fontSize={15} fill={C.muted}>
        snow line: high up is colder
      </text>
      {rain &&
        peaks.flatMap((i) =>
          ([-1, 1] as const).map((dir) => {
            const path = runoff(h, i, dir);
            if (path.length < 2) return null;
            const end = path[path.length - 1];
            const line = path.slice(1).flatMap((k, n) => along(pts, path[n], k));
            const d = line.map(([x, y], n) => `${n ? 'L' : 'M'}${x.toFixed(1)},${(y - 6).toFixed(1)}`).join(' ');
            return (
              <g key={`${i}${dir}`}>
                <path d={d} fill="none" stroke={shade(C.blue, -0.1)} strokeWidth={5} strokeDasharray="6 12" strokeLinecap="round" className="wy-flow" />
                {h[end] > SEA_H + 4 && <ellipse cx={XS[end]} cy={BASE - h[end] - 4} rx={22} ry={7} fill={WATER} stroke={C.ink} strokeWidth={1.5} />}
              </g>
            );
          }),
        )}
      {labels.map((l, i) => (l ? <Tag key={i} x={XS[i]} y={Math.max(84, BASE - h[i] - 40)} text={l} /> : null))}
      <rect x={30} y={64} width={660} height={456} rx={12} fill="none" stroke={C.ink} strokeWidth={3} />
    </g>
  );
}

// ── The scene ────────────────────────────────────────────────────────────────

function LandformsScene() {
  const [mode, setMode] = useState<'name' | 'shape'>('name');
  const [named, setNamed] = useState<FormId[]>([]);
  const [tray] = useState(() => shuffle(NAME_IDS));
  const [rain, setRain] = useState(false);
  const [h, setH] = useState(START_H);
  const [made, setMade] = useState<Label[]>([]);
  const [msg, setMsg] = useState<{ text: string; tone: 'plain' | 'good' | 'nudge' }>({
    text: 'Drag each word onto the part of the land it names.',
    tone: 'plain',
  });

  const drop = (id: FormId, p: Pt) => {
    const at = formAt(p);
    if (!at) return;
    if (at === id) {
      const next = [...named, id];
      setNamed(next);
      play('correct');
      setMsg({ text: next.length === NAME_IDS.length ? `Yes, a ${id}! You named every landform. Now press “Make it rain”.` : `Yes! A ${id} is ${FORM_INFO[id]}.`, tone: 'good' });
    } else {
      play('wrong');
      setMsg({ text: `${at === 'sea' ? 'That is the sea' : `That is the ${at}`}. ${CLUE[id]}`, tone: 'nudge' });
    }
  };

  const reshape = (i: number, v: number) => {
    const next = h.map((x, k) => (k === i ? v : x));
    setH(next);
    const now = new Set(classify(next).filter(Boolean) as Label[]);
    const fresh = GOALS.filter((g) => now.has(g) && !made.includes(g));
    if (fresh.length) {
      play('correct');
      const all = [...made, ...fresh];
      setMade(all);
      const g = fresh[0];
      setMsg({ text: all.length === GOALS.length ? `You made ${g === 'island' ? 'an' : 'a'} ${g}, and every landform on the list! Try “Rain” to see where the water goes.` : `You made ${g === 'island' ? 'an' : 'a'} ${g}: ${FORM_INFO[g]}.`, tone: 'good' });
    }
  };

  const toggleRain = () => {
    const r = !rain;
    setRain(r);
    play('tap');
    if (r)
      setMsg({
        text:
          mode === 'name'
            ? 'Rain and melting snow run downhill. Streams join to make a river, which flows along the valley and across the plain to the sea.'
            : 'Watch the water: it always flows downhill. Where it cannot go any lower, it collects in a lake or reaches the sea.',
        tone: 'plain',
      });
  };

  const switchMode = (m: 'name' | 'shape') => {
    setMode(m);
    setRain(false);
    play('tap');
    setMsg(
      m === 'name'
        ? { text: 'Drag each word onto the part of the land it names.', tone: 'plain' }
        : { text: 'This is a side view. Drag the dots up and down to shape the land. Can you make every landform on the list?', tone: 'plain' },
    );
  };

  return (
    <SceneSvg label="Landforms: name mountains, hills, valleys, plains, rivers, lakes, islands and peninsulas, or shape the land in a side view">
      <style>{MOTION_CSS}</style>
      {mode === 'name' ? (
        <g>
          <Poster rain={rain} />
          {named.map((id) => (
            <Tag key={id} x={TAG_AT[id][0]} y={TAG_AT[id][1]} text={id} />
          ))}
          {tray.map((id, k) => {
            if (named.includes(id)) return null;
            const x = 776 + (k % 2) * 136;
            const y = 156 + Math.floor(k / 2) * 56;
            return (
              <Draggable key={id} x={x} y={y} hit={30} label={`${id} word`} onDrop={(p) => drop(id, p)}>
                <rect x={x - 62} y={y - 22} width={124} height={44} rx={22} fill={C.white} stroke={C.ink} strokeWidth={2} />
                <text x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink} pointerEvents="none">
                  {id}
                </text>
              </Draggable>
            );
          })}
        </g>
      ) : (
        <g>
          <Profile h={h} rain={rain} />
          {h.map((v, i) => (
            <Handle key={i} i={i} h={v} onChange={reshape} />
          ))}
          <text x={714} y={150} fontSize={15} fill={C.muted} className="caps">
            Can you make…
          </text>
          {GOALS.map((g, i) => (
            <g key={g}>
              <rect x={714} y={162 + i * 48} width={264} height={40} rx={10} fill={made.includes(g) ? '#d8f6e6' : C.white} stroke={made.includes(g) ? C.green : C.line} strokeWidth={2} />
              <text x={728} y={188 + i * 48} fontSize={17} fontWeight={700} fill={C.ink}>
                {made.includes(g) ? '✓ ' : ''}{g === 'island' ? 'an' : 'a'} {g}
              </text>
            </g>
          ))}
          <SvgButton
            x={714}
            y={470}
            w={264}
            h={48}
            fontSize={17}
            label="Start again"
            onClick={() => {
              setH(START_H);
              setRain(false);
              play('tap');
            }}
          />
        </g>
      )}
      <SvgButton x={714} y={64} w={128} h={50} fontSize={18} label="Name it" active={mode === 'name'} color={mode === 'name' ? C.yellow : C.card} onClick={() => switchMode('name')} />
      <SvgButton x={850} y={64} w={128} h={50} fontSize={18} label="Shape it" active={mode === 'shape'} color={mode === 'shape' ? C.yellow : C.card} onClick={() => switchMode('shape')} />
      <SvgButton x={714} y={mode === 'name' ? 392 : 412} w={264} h={48} fontSize={17} label={rain ? 'Stop the rain' : mode === 'name' ? 'Make it rain' : 'Rain'} color={shade(C.blue, 0.6)} onClick={toggleRain} />
      <Note x={30} y={536} w={948} text={msg.text} tone={msg.tone} size={16} />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect width={120} height={80} rx={8} fill={SKY} />
      <path d="M0,56 L30,16 L48,40 L66,20 L92,56 Z" fill={ROCK} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M24,24 L30,16 L36,24 Z M60,28 L66,20 L72,28 Z" fill={C.white} />
      <rect y={54} width={120} height={26} fill={GRASS} />
      <path d="M86,54 H120 V80 H76 Z" fill={WATER} />
      <path d="M48,42 Q52,60 80,66" fill="none" stroke={WATER} strokeWidth={4} />
    </svg>
  );
}

// ── Practice ─────────────────────────────────────────────────────────────────

const PIC_IDS: FormId[] = ['mountain', 'hill', 'valley', 'plain', 'island', 'peninsula', 'lake'];
const article = (f: FormId) => (f === 'island' ? 'an island' : `a ${f}`);

const WHY: { prompt: string; answer: string; pool: string[]; hint: string; explain: string[] }[] = [
  {
    prompt: 'Which way does a river flow?',
    answer: 'Downhill, from high land towards the sea',
    pool: ['Uphill, from the sea to the mountains', 'It does not move at all', 'Round in a circle'],
    hint: 'Think about a ball let go on a slope. Which way does it roll?',
    explain: ['Water is pulled down by gravity, like a rolling ball.', 'So a river flows downhill, from high land towards the sea.'],
  },
  {
    prompt: 'Why can there be snow on the top of a high mountain, even in summer?',
    answer: 'High up, the air is much colder',
    pool: ['The top is closer to the Sun, so it is cold', 'Clouds paint the top white', 'Snow only falls on rocks'],
    hint: 'Think about what happens to the air as you climb higher.',
    explain: ['The higher you go, the colder the air gets.', 'High up, the air is much colder, so snow can stay all year.'],
  },
  {
    prompt: 'Rain falls on a mountain. Where does the water go?',
    answer: 'It runs downhill into streams and rivers',
    pool: ['It climbs to the top of the mountain', 'It stays on the slope forever', 'It turns into rock'],
    hint: 'Water always looks for the lowest way down.',
    explain: ['Water runs down the slopes.', 'Little streams join together into rivers that flow towards the sea.', 'So it runs downhill into streams and rivers.'],
  },
  {
    prompt: 'What is the difference between a hill and a mountain?',
    answer: 'A mountain is higher and steeper',
    pool: ['A hill is always higher', 'A mountain is always flat', 'They are always the same height'],
    hint: 'Picture climbing each one. Which would take longer?',
    explain: ['Both are raised land.', 'A mountain is higher and steeper, often with a pointed peak; a hill is lower and rounder.'],
  },
];

function makeQuestion(level: number): Question {
  if (level === 0) {
    const id = pick(PIC_IDS);
    return mcq({
      prompt: `Which picture shows ${article(id)}?`,
      answer: FORM_NAME[id],
      options: [id, ...others(PIC_IDS, id, 2)].map((f) => ({ value: FORM_NAME[f], art: <FormPic id={f} size={70} /> })),
      hint: `Look for ${FORM_INFO[id]}.`,
      explain: [`${article(id)[0].toUpperCase()}${article(id).slice(1)} is ${FORM_INFO[id]}.`, `This picture shows that: it is the ${FORM_NAME[id]}.`],
    });
  }
  if (level === 1) {
    const id = pick<FormId>(['mountain', 'hill', 'valley', 'plain', 'island', 'peninsula', 'lake', 'river']);
    return mcq({
      prompt: `What do we call ${FORM_INFO[id]}?`,
      answer: FORM_NAME[id],
      options: [id, ...others<FormId>(['mountain', 'hill', 'valley', 'plain', 'island', 'peninsula', 'lake', 'river'], id, 2)].map((f) => ({ value: FORM_NAME[f] })),
      plain: true,
      hint: 'Picture it: is it land or water? High, low or flat? What is around it?',
      explain: [`We are looking for ${FORM_INFO[id]}.`, `That is called ${article(id)}.`],
    });
  }
  const q = pick(WHY);
  return mcq({
    prompt: q.prompt,
    answer: q.answer,
    options: [{ value: q.answer }, ...shuffle(q.pool).slice(0, 2).map((v) => ({ value: v }))],
    plain: true,
    hint: q.hint,
    explain: q.explain,
  });
}

export const landforms: Lesson = {
  id: 'landforms',
  title: 'Mountains, Valleys and Rivers',
  Thumb,
  Scene: LandformsScene,
  sceneHint: 'Name it: drag words onto the land · Shape it: drag the dots to make landforms',
  learn: {
    heading: 'The shapes of the land',
    intro: 'The land has many shapes, called landforms. Some are high, some are low and some are flat.',
    points: [
      { icon: Mountain, text: 'Mountains are very high and steep. Hills are lower and rounder. Valleys are the low land between them.' },
      { icon: Waves, text: 'An island has water all around. A peninsula has water on three sides.' },
      { icon: CloudRain, text: 'Rainwater flows downhill into rivers, and rivers flow towards the sea.' },
    ],
  },
  steps: ['Look at the height: high, low or flat?', 'Look at the shape: steep and pointed, or low and round?', 'Look at the water: where is it, and what is around it?', 'Name the landform.'],
  example: {
    question: 'This land has water on three sides. What is it?',
    visual: <FormPic id="peninsula" size={180} />,
    work: ['The green part is land.', 'Water is on the top, the bottom and the end of it.', 'Water on three sides makes it a peninsula.'],
    answer: 'A peninsula',
  },
  grownups: [
    'Build landforms in a sandpit or with play dough, then pour water on top and watch where it runs.',
    'On walks, notice hills, slopes and where puddles form: water always gathers in the lowest places.',
    'Look at a relief map or globe with raised mountains, and trace a river from the mountains to the sea.',
  ],
  makeQuestion,
};
