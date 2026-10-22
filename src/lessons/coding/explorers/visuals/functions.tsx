import { C, shade } from '../../../../lib/color';
import { BLOCK_COLORS, BlockTile, DIR_NAME, blockWords, move } from '../../engine';
import type { Block, Dir } from '../../engine';

/**
 * A function and a program that uses it, as a small picture:
 *   hop = ↑ → → ↓
 *   program: hop → hop
 */
export function FunctionPicture({ name, body, main, size = 48 }: { name: string; body: Dir[]; main: Block[]; size?: number }) {
  const gap = 8;
  const labelW = 150;
  const rowW = (n: number) => labelW + Math.max(1, n) * (size + gap);
  const w = Math.max(rowW(body.length), rowW(main.length)) + 12;
  const rowH = size + 22;
  const label = (y: number, text: string, color: string) => (
    <g>
      <rect x={0} y={y} width={labelW - 12} height={size} rx={10} fill={color} stroke={C.ink} strokeWidth={2} />
      <text x={(labelW - 12) / 2} y={y + size / 2} textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={800} fill="white">
        {text}
      </text>
    </g>
  );
  return (
    <svg
      viewBox={`-4 -4 ${w + 8} ${rowH * 2 + 4}`}
      role="img"
      aria-label={`${name} is: ${body.map((d) => DIR_NAME[d]).join(', ')}. The program is: ${main.map(blockWords).join(', ')}`}
    >
      <rect x={-2} y={-2} width={w + 4} height={size + 12} rx={12} fill={shade(BLOCK_COLORS.call, 0.8)} />
      {label(4, `${name} =`, BLOCK_COLORS.call)}
      {body.map((d, i) => (
        <BlockTile key={i} block={{ ...move(d), id: `f${i}` }} x={labelW + i * (size + gap)} y={4} s={size} />
      ))}
      {!body.length && (
        <g>
          <rect x={labelW} y={4} width={size} height={size} rx={10} fill="white" stroke={C.ink} strokeWidth={2} strokeDasharray="6 4" />
          <text x={labelW + size / 2} y={4 + size / 2} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.6} fontWeight={800} fill={C.muted}>
            ?
          </text>
        </g>
      )}
      {label(rowH + 10, 'program', C.ink2)}
      {main.map((b, i) => (
        <BlockTile key={b.id} block={b} x={labelW + i * (size + gap)} y={rowH + 10} s={size} />
      ))}
    </svg>
  );
}
