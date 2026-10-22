import { C, shade } from '../../../../lib/color';
import { BLOCK_COLORS } from '../../engine';

export type Op = 'AND' | 'OR';
export const apply = (op: Op, a: boolean, b: boolean) => (op === 'AND' ? a && b : a || b);
export const yn = (v: boolean) => (v ? 'YES' : 'NO');
/** The four rows of a two-input truth table, in the usual order. */
export const ROWS: [boolean, boolean][] = [
  [false, false],
  [false, true],
  [true, false],
  [true, true],
];

/** A garden gate with a light on top: green and open, or red and shut. */
export function Gate({ x, y, w, h, open }: { x: number; y: number; w: number; h: number; open: boolean }) {
  const postW = 22;
  const doorW = (w - postW * 2) / 2;
  const door = (dx: number, flip: boolean) => {
    const left = x + postW + dx;
    // An open door swings back: drawn narrower, like a door seen from the side.
    const ww = open ? doorW * 0.28 : doorW;
    const xx = flip ? left + doorW - ww : left;
    return (
      <g style={{ transition: 'all 0.4s ease' }}>
        <rect x={xx} y={y + 40} width={ww} height={h - 40} rx={6} fill={shade(C.wood, -0.05)} stroke={C.ink} strokeWidth={2.5} />
        {[0.3, 0.65].map((f) => (
          <line key={f} x1={xx + 4} y1={y + 40 + (h - 40) * f} x2={xx + ww - 4} y2={y + 40 + (h - 40) * f} stroke={shade(C.wood, -0.35)} strokeWidth={4} />
        ))}
      </g>
    );
  };
  return (
    <g>
      <rect x={x - 20} y={y + h - 6} width={w + 40} height={12} rx={6} fill={shade(C.green, 0.4)} />
      <rect x={x} y={y + 24} width={postW} height={h - 24} rx={6} fill={shade(C.wood, -0.25)} stroke={C.ink} strokeWidth={2.5} />
      <rect x={x + w - postW} y={y + 24} width={postW} height={h - 24} rx={6} fill={shade(C.wood, -0.25)} stroke={C.ink} strokeWidth={2.5} />
      {door(0, false)}
      {door(doorW, true)}
      <circle cx={x + w / 2} cy={y + 14} r={16} fill={open ? C.green : C.red} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={x + w / 2 - 5} cy={y + 9} r={4} fill="white" opacity={0.6} />
    </g>
  );
}

/** A truth table for two inputs. `results[i]` is null for a row not tried yet; `mark` highlights a row. */
export function TruthTable({
  x,
  y,
  w,
  heads,
  results,
  mark,
  rowH = 54,
  out = ['open', 'shut'],
}: {
  x: number;
  y: number;
  w: number;
  heads: [string, string, string];
  results: (boolean | null)[];
  mark?: number;
  rowH?: number;
  out?: [string, string];
}) {
  const col = w / 3;
  const cellText = (v: boolean | null, isOut: boolean) => (v === null ? '?' : isOut ? (v ? out[0] : out[1]) : yn(v));
  return (
    <g>
      <rect x={x} y={y} width={w} height={rowH * 5} rx={14} fill="white" stroke={C.ink} strokeWidth={2} />
      <rect x={x} y={y} width={w} height={rowH} rx={14} fill={shade(BLOCK_COLORS.if, 0.7)} stroke={C.ink} strokeWidth={2} />
      {heads.map((h, i) => (
        <text key={h} x={x + col * (i + 0.5)} y={y + rowH / 2} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={800} fill={C.ink}>
          {h}
        </text>
      ))}
      {ROWS.map(([a, b], r) => {
        const ry = y + rowH * (r + 1);
        const res = results[r];
        return (
          <g key={r}>
            {mark === r && <rect x={x + 4} y={ry + 3} width={w - 8} height={rowH - 6} rx={10} fill={shade(C.yellow, 0.45)} />}
            <line x1={x} y1={ry} x2={x + w} y2={ry} stroke={C.line} strokeWidth={2} />
            {[a, b].map((v, i) => (
              <text key={i} x={x + col * (i + 0.5)} y={ry + rowH / 2} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={700} fill={v ? C.ink : C.muted}>
                {yn(v)}
              </text>
            ))}
            <text x={x + col * 2.5} y={ry + rowH / 2} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={800} fill={res === null ? C.muted : res ? shade(C.green, -0.3) : C.red}>
              {cellText(res, true)}
            </text>
          </g>
        );
      })}
      <line x1={x + col} y1={y} x2={x + col} y2={y + rowH * 5} stroke={C.line} strokeWidth={2} />
      <line x1={x + col * 2} y1={y} x2={x + col * 2} y2={y + rowH * 5} stroke={C.line} strokeWidth={2} />
    </g>
  );
}

/** A truth table as a standalone picture (for practice questions). */
export function TablePicture({ heads, results, out }: { heads: [string, string, string]; results: (boolean | null)[]; out?: [string, string] }) {
  return (
    <svg viewBox="-4 -4 368 278" role="img" aria-label={`Truth table: ${ROWS.map(([a, b], i) => `${heads[0]} ${yn(a)}, ${heads[1]} ${yn(b)}: ${results[i] === null ? 'unknown' : results[i] ? 'yes' : 'no'}`).join('; ')}`}>
      <TruthTable x={0} y={0} w={360} heads={heads} results={results} rowH={54} out={out} />
    </svg>
  );
}

export type CodeLine = { text: string; indent?: number; kind?: 'if' | 'else' | 'do' | 'set' | 'def' | 'loop' };

/** A few lines of code in a card, coloured by kind (if / else purple, actions blue, variables orange, functions teal, loops amber). */
export function CodePicture({ lines, w = 440 }: { lines: CodeLine[]; w?: number }) {
  const h = 40;
  const color = (k?: CodeLine['kind']) =>
    k === 'if' || k === 'else' ? BLOCK_COLORS.if : k === 'set' ? '#f2994a' : k === 'do' ? BLOCK_COLORS.motion : k === 'def' ? shade(BLOCK_COLORS.call, -0.2) : k === 'loop' ? shade(BLOCK_COLORS.repeat, -0.2) : C.ink;
  return (
    <svg viewBox={`-4 -4 ${w + 8} ${lines.length * h + 20}`} role="img" aria-label={lines.map((l) => l.text).join('. ')}>
      <rect x={0} y={0} width={w} height={lines.length * h + 12} rx={14} fill="white" stroke={C.ink} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={18 + (l.indent ?? 0) * 30} y={6 + i * h + h / 2} dominantBaseline="central" fontSize={21} fontWeight={l.kind === 'if' || l.kind === 'else' || l.kind === 'def' ? 800 : 700} fill={color(l.kind)}>
          {l.text}
        </text>
      ))}
    </svg>
  );
}
