import { C, shade } from '../lib/color';
import { SvgButton } from './widgets';

/**
 * Predict → observe → explain, the shared pattern for science scenes.
 * Asking for a prediction before the experiment surfaces what a child already believes,
 * so the result can confirm it or gently challenge it (conceptual change).
 *
 *   const [guess, setGuess] = useState<string | null>(null);
 *   <PredictCard x={60} y={40} question="Will the apple float?" options={['Float', 'Sink']}
 *     prediction={guess} onPredict={setGuess} />
 *   …run the experiment (only once guess is set, or let them skip)…
 *   <ExplainCard x={60} y={40} prediction={guess} actual="Float"
 *     because="It is lighter than the same amount of water." onAgain={() => setGuess(null)} />
 *
 * Draw it inside the scene's <SceneSvg>. Scene text is in a 1000 × 680 world.
 */
export function PredictCard({
  x,
  y,
  w = 300,
  question,
  options,
  prediction,
  onPredict,
}: {
  x: number;
  y: number;
  w?: number;
  question: string;
  /** 2–3 short options. */
  options: string[];
  prediction: string | null;
  onPredict: (option: string) => void;
}) {
  const btnW = (w - 28 - (options.length - 1) * 10) / options.length;
  // Long questions wrap onto extra lines; the card grows to fit.
  const lines = wrap(question, Math.floor((w - 28) / 10));
  const extra = (lines.length - 1) * 23;
  const h = (prediction ? 92 : 128) + extra;
  return (
    <g>
      <rect x={x + 3} y={y + 5} width={w} height={h} rx={16} fill={C.ink} opacity={0.1} />
      <rect x={x} y={y} width={w} height={h} rx={16} fill={shade(C.yellow, 0.75)} stroke={C.ink} strokeWidth={2} />
      <text x={x + 14} y={y + 24} fontSize={13} fill={C.muted} className="caps">
        1 · Predict
      </text>
      {lines.map((line, i) => (
        <text key={i} x={x + 14} y={y + 50 + i * 23} fontSize={19} fontWeight={700} fill={C.ink}>
          {line}
        </text>
      ))}
      {prediction ? (
        <text x={x + 14} y={y + 76 + extra} fontSize={16} fill={C.ink2}>
          You think: <tspan fontWeight={700}>{prediction}</tspan>. Now try it!
        </text>
      ) : (
        options.map((o, i) => {
          const bx = x + 14 + i * (btnW + 10);
          // Sized with room to spare: bold display letters (m, w) run wide, more so when the stage draws small.
          const size = Math.max(13, Math.min(17, Math.floor((btnW - 18) / (o.length * 0.66))));
          // Too long for one line even at the smallest size: break it over two.
          const lines = o.length * size * 0.66 > btnW - 18 ? splitInTwo(o) : [o];
          return (
            <SvgButton
              key={o}
              x={bx}
              y={y + 64 + extra}
              w={btnW}
              h={48}
              fontSize={lines.length > 1 ? fitText(lines.reduce((a, b) => (b.length > a.length ? b : a)), btnW - 12, 15, 12) : size}
              label={
                lines.length > 1
                  ? lines.map((line, j) => (
                      <tspan key={j} x={bx + btnW / 2} dy={j === 0 ? '-0.55em' : '1.1em'}>
                        {line}
                      </tspan>
                    ))
                  : o
              }
              title={o}
              onClick={() => onPredict(o)}
            />
          );
        })
      )}
    </g>
  );
}

export function ExplainCard({
  x,
  y,
  w = 300,
  prediction,
  actual,
  because,
  onAgain,
}: {
  x: number;
  y: number;
  w?: number;
  prediction: string | null;
  actual: string;
  /** One short, true sentence that explains the result. */
  because: string;
  onAgain?: () => void;
}) {
  const matched = prediction !== null && prediction === actual;
  const title = prediction === null ? `It was: ${actual}` : matched ? `You were right: ${actual}!` : `Surprise! It was: ${actual}`;
  const titleLines = wrap(title, Math.floor((w - 28) / 10.5));
  const tExtra = (titleLines.length - 1) * 23;
  const lines = wrap(because, Math.floor((w - 28) / 8.6));
  const h = 86 + tExtra + lines.length * 21 + (onAgain ? 56 : 0);
  return (
    <g>
      <rect x={x + 3} y={y + 5} width={w} height={h} rx={16} fill={C.ink} opacity={0.1} />
      <rect x={x} y={y} width={w} height={h} rx={16} fill={shade(matched ? C.green : C.blue, 0.82)} stroke={C.ink} strokeWidth={2} />
      <text x={x + 14} y={y + 24} fontSize={13} fill={C.muted} className="caps">
        2 · What happened · 3 · Why
      </text>
      {titleLines.map((line, i) => (
        <text key={`t${i}`} x={x + 14} y={y + 52 + i * 23} fontSize={19} fontWeight={700} fill={C.ink}>
          {line}
        </text>
      ))}
      {lines.map((line, i) => (
        <text key={i} x={x + 14} y={y + 80 + tExtra + i * 21} fontSize={16} fill={C.ink2}>
          {line}
        </text>
      ))}
      {onAgain && <SvgButton x={x + 14} y={y + h - 58} w={150} h={44} fontSize={16} label="Try another" onClick={onAgain} />}
    </g>
  );
}

/** Largest font size (up to `max`) that fits `text` in `width` world units, roughly. */
export function fitText(text: string, width: number, max: number, min = 14): number {
  return Math.max(min, Math.min(max, Math.floor(width / (text.length * 0.56))));
}

/** Break a short label at the space nearest its middle. */
function splitInTwo(text: string): string[] {
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}

/** Greedy word wrap for SVG text. */
export function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let line = '';
  // Split on ordinary spaces only, so non-breaking spaces (e.g. "45 > 38") keep a phrase together.
  for (const word of text.split(/ +/)) {
    if (line && (line + ' ' + word).length > maxChars) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}
