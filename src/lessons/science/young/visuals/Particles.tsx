import { C } from '../../../../lib/color';
import { ATOM } from './Molecule';

/**
 * Tiny particle models for "zoom in" panels: each molecule is drawn atom by atom (model-kit colours),
 * so atoms can be counted before and after a change. Sugar is drawn as a simple ring.
 */
type PEl = 'H' | 'C' | 'O' | 'Na';
export type MolKind = 'water' | 'co2' | 'soda' | 'acid' | 'acetate' | 'sugar';

const COLOR: Record<PEl, string> = { H: ATOM.H.color, C: ATOM.C.color, O: ATOM.O.color, Na: C.purple };
const R: Record<PEl, number> = { H: 5.5, C: 8, O: 8.5, Na: 9.5 };

const ATOMS: Record<Exclude<MolKind, 'sugar'>, [PEl, number, number][]> = {
  water: [['H', -10, 8], ['H', 10, 8], ['O', 0, 0]],
  co2: [['O', -15, 0], ['O', 15, 0], ['C', 0, 0]],
  // Baking soda, NaHCO₃
  soda: [['H', -24, 14], ['O', -13, 8], ['O', 13, 8], ['O', 0, -15], ['C', 0, 0], ['Na', 26, 16]],
  // Acetic acid (in vinegar), CH₃COOH
  acid: [['H', -20, -6], ['H', -16, 11], ['H', -9, -14], ['H', 28, 16], ['C', -9, 0], ['C', 8, 0], ['O', 17, -11], ['O', 17, 11]],
  // Sodium acetate, CH₃COONa
  acetate: [['H', -20, -6], ['H', -16, 11], ['H', -9, -14], ['C', -9, 0], ['C', 8, 0], ['O', 17, -11], ['O', 17, 11], ['Na', 31, 18]],
};

export const atomCount = (kind: MolKind) => (kind === 'sugar' ? 45 : ATOMS[kind].length);

export function Mol({ kind, x, y, rot = 0, scale = 1, className }: { kind: MolKind; x: number; y: number; rot?: number; scale?: number; className?: string }) {
  const transform = `translate(${x} ${y}) rotate(${rot}) scale(${scale})`;
  if (kind === 'sugar') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${(15 * Math.cos(a)).toFixed(1)},${(15 * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return (
      <g className={className}>
        <g transform={transform}>
          <polygon points={pts} fill="#fff7e0" stroke="#c99a16" strokeWidth={4} strokeLinejoin="round" />
          <circle cx={0} cy={0} r={4} fill="#c99a16" />
        </g>
      </g>
    );
  }
  return (
    // className goes on an outer group so a CSS animation can't replace the transform.
    <g className={className}>
      <g transform={transform}>
        {ATOMS[kind].map(([el, ax, ay], i) => (
          <circle key={i} cx={ax} cy={ay} r={R[el]} fill={COLOR[el]} stroke={C.ink} strokeWidth={1.3} />
        ))}
      </g>
    </g>
  );
}
