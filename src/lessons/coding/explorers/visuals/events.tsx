import { C, shade } from '../../../../lib/color';
import { ArrowGlyph, BlockTile, DIR_NAME, uid } from '../../engine';
import type { Dir } from '../../engine';

/** Things that can happen in the little game, each with its own "when …" script. */
export type EventName = 'up' | 'right' | 'down' | 'left' | 'star';
export const EVENTS: EventName[] = ['left', 'right', 'up', 'down', 'star'];
export const EVENT_DIR: Record<Exclude<EventName, 'star'>, Dir> = { up: 0, right: 1, down: 2, left: 3 };
export const EVENT_COLOR = '#f2b01e';
export const SCORE_COLOR = '#f2994a';
export const SOUND_COLOR = '#d061b8';

export type Action = { id: string; kind: 'move'; dir: Dir } | { id: string; kind: 'score' } | { id: string; kind: 'ding' };
export type Scripts = Record<EventName, Action[]>;

export const moveAct = (dir: Dir): Action => ({ id: uid(), kind: 'move', dir });
export const scoreAct = (): Action => ({ id: uid(), kind: 'score' });
export const dingAct = (): Action => ({ id: uid(), kind: 'ding' });

/** "when ▶ tapped", in words. */
export const eventWords = (e: EventName) => (e === 'star' ? 'when the robot touches a star' : `when the ${DIR_NAME[EVENT_DIR[e]]} button is tapped`);
export const actionWords = (a: Action) => (a.kind === 'move' ? `move ${DIR_NAME[a.dir]}` : a.kind === 'score' ? 'add 1 to the score' : 'play a ding');
export const scriptWords = (list: Action[]) => (list.length ? list.map(actionWords).join(', then ') : 'nothing');

/** One action block with its top-left at (x, y). */
export function ActionTile({ a, x, y, s, state }: { a: Action; x: number; y: number; s: number; state?: 'active' | 'failed' }) {
  if (a.kind === 'move') return <BlockTile block={{ kind: 'move', id: a.id, dir: a.dir }} x={x} y={y} s={s} state={state} />;
  const color = a.kind === 'score' ? SCORE_COLOR : SOUND_COLOR;
  return (
    <g>
      {state && <rect x={x - 6} y={y - 6} width={s + 12} height={s + 12} rx={16} fill={state === 'active' ? C.yellow : C.red} opacity={0.75} />}
      <rect x={x + 2} y={y + 4} width={s} height={s} rx={12} fill={shade(color, -0.35)} />
      <rect x={x} y={y} width={s} height={s} rx={12} fill={color} stroke={C.ink} strokeWidth={2.2} />
      {a.kind === 'score' ? (
        <>
          <text x={x + s / 2} y={y + s * 0.4} textAnchor="middle" dominantBaseline="central" fontSize={s * 0.36} fontWeight={800} fill="white">
            +1
          </text>
          <text x={x + s / 2} y={y + s * 0.76} textAnchor="middle" dominantBaseline="central" fontSize={Math.max(11, s * 0.2)} fontWeight={700} fill="white">
            score
          </text>
        </>
      ) : (
        <g transform={`translate(${x + s / 2} ${y + s / 2}) scale(${s / 64})`}>
          <path d="M-14,10 Q-14,-16 0,-18 Q14,-16 14,10 L18,15 L-18,15 Z" fill="white" stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
          <circle cx={0} cy={20} r={4} fill="white" stroke={C.ink} strokeWidth={2} />
        </g>
      )}
    </g>
  );
}

/** The "when …" hat at the start of a script, w wide and h tall. */
export function EventHat({ e, x, y, w, h, active, selected }: { e: EventName; x: number; y: number; w: number; h: number; active?: boolean; selected?: boolean }) {
  const k = h / 64;
  return (
    <g>
      {(active || selected) && <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={16} fill={active ? C.yellow : shade(C.yellow, 0.4)} opacity={active ? 0.8 : 1} />}
      <rect x={x + 2} y={y + 4} width={w} height={h} rx={14} fill={shade(EVENT_COLOR, -0.3)} />
      <rect x={x} y={y} width={w} height={h} rx={14} fill={EVENT_COLOR} stroke={C.ink} strokeWidth={2.2} />
      <text x={x + 14 * k} y={y + h / 2} dominantBaseline="central" fontSize={19 * k} fontWeight={800} fill={C.ink}>
        when
      </text>
      {e === 'star' ? (
        <>
          <circle cx={x + 88 * k} cy={y + h / 2} r={18 * k} fill="white" stroke={C.ink} strokeWidth={2} />
          <Star cx={x + 88 * k} cy={y + h / 2 + k} r={13 * k} />
          <text x={x + 114 * k} y={y + h / 2} dominantBaseline="central" fontSize={18 * k} fontWeight={700} fill={C.ink}>
            touched
          </text>
        </>
      ) : (
        <>
          <rect x={x + 70 * k} y={y + 12 * k} width={40 * k} height={40 * k} rx={9 * k} fill="white" stroke={C.ink} strokeWidth={2} />
          <ArrowGlyph cx={x + 90 * k} cy={y + 32 * k} s={30 * k} dir={EVENT_DIR[e]} color={C.ink} />
          <text x={x + 120 * k} y={y + h / 2} dominantBaseline="central" fontSize={18 * k} fontWeight={700} fill={C.ink}>
            tapped
          </text>
        </>
      )}
    </g>
  );
}

export function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
  }).join(' ');
  return <polygon points={pts} fill={C.yellow} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />;
}

/** The game's scripts as a small picture for practice questions (only the events listed). */
export function EventsPicture({ scripts, events }: { scripts: Scripts; events: EventName[] }) {
  const h = 52;
  const gap = 12;
  const hatW = 190;
  const s = 44;
  const maxLen = Math.max(1, ...events.map((e) => scripts[e].length));
  const w = hatW + 14 + maxLen * (s + 8) + 8;
  const H = events.length * (h + gap) - gap + 12;
  return (
    <svg viewBox={`-4 -4 ${w + 8} ${H + 4}`} role="img" aria-label={events.map((e) => `${eventWords(e)}: ${scriptWords(scripts[e])}`).join('. ')}>
      {events.map((e, i) => {
        const y = i * (h + gap);
        const list = scripts[e];
        return (
          <g key={e}>
            <EventHat e={e} x={0} y={y} w={hatW} h={h} />
            {list.length ? (
              list.map((a, j) => <ActionTile key={a.id} a={a} x={hatW + 14 + j * (s + 8)} y={y + (h - s) / 2} s={s} />)
            ) : (
              <text x={hatW + 16} y={y + h / 2} dominantBaseline="central" fontSize={17} fontStyle="italic" fill={C.muted}>
                (no blocks)
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
