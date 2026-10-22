import { C } from '../../../../lib/color';

/** Split a message into short lines for an SVG text box. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > max && line) {
      lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

/** A small card with a wrapped, centred message (the scene's "what happened" readout). */
export function MessageBox({ x, y, w, h, text, max = 30, size = 16 }: { x: number; y: number; w: number; h: number; text: string; max?: number; size?: number }) {
  const lines = wrap(text, max);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text x={x + w / 2} y={y + h / 2} textAnchor="middle" fontSize={size} fontWeight={600} fill={C.ink}>
        {lines.map((line, i) => (
          <tspan key={i} x={x + w / 2} dy={i === 0 ? `${-(lines.length - 1) * 0.6 + 0.35}em` : '1.2em'}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
