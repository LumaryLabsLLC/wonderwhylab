import { C, shade } from '../../../../lib/color';
import { EMOJI_FONT } from '../../../../games/reading/words';
import { wrap } from '../../../../stage/Predict';

/** A piece of text with its own colour (e.g. a highlighted vowel team or word part). */
export interface Part {
  t: string;
  c?: string;
  bold?: boolean;
}

export type CardState = 'idle' | 'selected' | 'right' | 'wrong';

const FILL: Record<CardState, string> = {
  idle: C.white,
  selected: shade(C.yellow, 0.7),
  right: shade(C.green, 0.75),
  wrong: shade(C.red, 0.78),
};

/** A word card centred on (0, 0). */
export function WordCard({
  w,
  h = 64,
  parts,
  fontSize = 30,
  state = 'idle',
  fill,
}: {
  w: number;
  h?: number;
  parts: Part[];
  fontSize?: number;
  state?: CardState;
  fill?: string;
}) {
  return (
    <g>
      <rect x={-w / 2 + 3} y={-h / 2 + 5} width={w} height={h} rx={14} fill={C.ink} opacity={0.14} />
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={14}
        fill={fill ?? FILL[state]}
        stroke={state === 'selected' ? shade(C.orange, -0.2) : C.ink}
        strokeWidth={state === 'selected' ? 3.5 : 2.5}
      />
      <text textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={600} fill={C.ink}>
        {parts.map((p, i) => (
          <tspan key={i} fill={p.c ?? C.ink} fontWeight={p.bold ? 800 : 600}>
            {p.t}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/** A sentence card with wrapped lines, top-left at (0, 0). Returns nothing fancy: just a readable strip. */
export function SentenceCard({
  w,
  text,
  fontSize = 19,
  state = 'idle',
  fill,
  maxChars,
  highlight,
}: {
  w: number;
  text: string;
  fontSize?: number;
  state?: CardState;
  fill?: string;
  /** Characters per line; defaults to a value that fits `w`. */
  maxChars?: number;
  /** Words to colour (e.g. signal words). */
  highlight?: { words: string[]; color: string };
}) {
  const lines = wrap(text, maxChars ?? Math.floor((w - 28) / (fontSize * 0.5)));
  const lh = fontSize * 1.3;
  const h = sentenceHeight(lines.length, fontSize);
  return (
    <g>
      <rect x={3} y={5} width={w} height={h} rx={12} fill={C.ink} opacity={0.12} />
      <rect
        width={w}
        height={h}
        rx={12}
        fill={fill ?? FILL[state]}
        stroke={state === 'selected' ? shade(C.orange, -0.2) : C.ink}
        strokeWidth={state === 'selected' ? 3.5 : 2}
      />
      {lines.map((line, i) => (
        <text key={i} x={14} y={14 + fontSize * 0.85 + i * lh} fontSize={fontSize} fill={C.ink}>
          {highlight ? colour(line, highlight) : line}
        </text>
      ))}
    </g>
  );
}

export function sentenceHeight(lines: number, fontSize = 19) {
  return 28 + lines * fontSize * 1.3 - fontSize * 0.3;
}

export function sentenceLines(text: string, w: number, fontSize = 19) {
  return wrap(text, Math.floor((w - 28) / (fontSize * 0.5))).length;
}

function colour(line: string, h: { words: string[]; color: string }) {
  const lower = h.words.map((w) => w.toLowerCase());
  return line.split(/(\s+)/).map((tok, i) => {
    const bare = tok.replace(/[^a-zA-Z ]/g, '').toLowerCase();
    const hit = lower.some((w) => bare === w || (w.includes(' ') && line.toLowerCase().includes(w) && w.split(' ').includes(bare)));
    return (
      <tspan key={i} fill={hit ? h.color : undefined} fontWeight={hit ? 800 : undefined}>
        {tok}
      </tspan>
    );
  });
}

/** Big emoji picture centred on (x, y). */
export function Emoji({ x = 0, y = 0, size = 60, char }: { x?: number; y?: number; size?: number; char: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} style={{ fontFamily: EMOJI_FONT }}>
      {char}
    </text>
  );
}

/** A short paragraph as a picture for practice questions. */
export function ParagraphPicture({ text, width = 520 }: { text: string; width?: number }) {
  const fs = 22;
  const lines = wrap(text, Math.floor(width / (fs * 0.5)));
  const h = lines.length * fs * 1.35 + 16;
  return (
    <svg viewBox={`0 0 ${width} ${h}`} role="img" aria-label={text}>
      {lines.map((l, i) => (
        <text key={i} x={0} y={fs + i * fs * 1.35} fontSize={fs} fill={C.ink} style={{ fontFamily: 'var(--font-body)' }}>
          {l}
        </text>
      ))}
    </svg>
  );
}

/** A single sentence picture, word(s) optionally highlighted. */
export function SentencePicture({ text, mark }: { text: string; mark?: string }) {
  const fs = 24;
  const lines = wrap(text, 34);
  const h = lines.length * fs * 1.35 + 14;
  return (
    <svg viewBox={`0 0 460 ${h}`} role="img" aria-label={text}>
      {lines.map((l, i) => (
        <text key={i} x={230} y={fs + i * fs * 1.35} fontSize={fs} textAnchor="middle" fill={C.ink} style={{ fontFamily: 'var(--font-body)' }}>
          {mark
            ? l.split(/(\s+)/).map((tok, k) => {
                const m = /^(.*?)([.,!?;:”’"]*)$/.exec(tok)!;
                const hit = m[1].replace(/[^a-zA-Z]/g, '').toLowerCase() === mark.toLowerCase();
                return hit ? (
                  <tspan key={k}>
                    <tspan fill={shade(C.purple, -0.15)} fontWeight={800} textDecoration="underline">
                      {m[1]}
                    </tspan>
                    {m[2]}
                  </tspan>
                ) : (
                  <tspan key={k}>{tok}</tspan>
                );
              })
            : l}
        </text>
      ))}
    </svg>
  );
}
