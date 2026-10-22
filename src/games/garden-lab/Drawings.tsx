import type { Crop, FlowerKind, FruitShape, Need, StageId } from './rounds';

const INK = '#1e2b4a';
const LEAF = '#34c47c';
const SOIL = '#7a5236';
const S = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** A ring of petals around (cx, cy). */
function Petals({ cx, cy, r, n, colour, size = 1 }: { cx: number; cy: number; r: number; n: number; colour: string; size?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy - r}
          rx={7 * size}
          ry={11 * size}
          fill={colour}
          {...S}
          strokeWidth={2}
          transform={`rotate(${(360 / n) * i} ${cx} ${cy})`}
        />
      ))}
    </g>
  );
}

/** A fruit (with its seeds showing for the life cycle). */
export function Fruit({ cx, cy, r, colour, shape, seeds = false }: { cx: number; cy: number; r: number; colour: string; shape: FruitShape; seeds?: boolean }) {
  if (shape === 'pod') {
    return (
      <g transform={`rotate(-20 ${cx} ${cy})`}>
        <path d={`M${cx - r * 1.5} ${cy} Q${cx} ${cy - r * 1.3} ${cx + r * 1.5} ${cy} Q${cx} ${cy + r * 1.1} ${cx - r * 1.5} ${cy}Z`} fill={colour} {...S} strokeWidth={2} />
        {[-0.8, -0.27, 0.27, 0.8].map((k) => (
          <circle key={k} cx={cx + k * r} cy={cy - r * 0.05} r={r * 0.28} fill="#b6e388" {...S} strokeWidth={1.5} />
        ))}
      </g>
    );
  }
  const rx = shape === 'oval' ? r * 1.15 : r;
  const ry = shape === 'oval' ? r * 0.85 : r;
  return (
    <g>
      <path d={`M${cx} ${cy - ry} l2 -${r * 0.4}`} {...S} strokeWidth={2} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={colour} {...S} strokeWidth={2} />
      {seeds ? (
        <g>
          <ellipse cx={cx} cy={cy} rx={rx * 0.62} ry={ry * 0.62} fill="#fff6d6" opacity={0.85} />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={cx} cy={cy - ry * 0.32} rx={r * 0.09} ry={r * 0.15} fill="#6b4a2f" transform={`rotate(${a} ${cx} ${cy})`} />
          ))}
        </g>
      ) : (
        <ellipse cx={cx - rx * 0.35} cy={cy - ry * 0.35} rx={rx * 0.18} ry={ry * 0.12} fill="white" opacity={0.6} />
      )}
      <path d={`M${cx} ${cy - ry + 1} q-${r * 0.5} -${r * 0.35} -${r * 0.7} 0 q${r * 0.4} ${r * 0.2} ${r * 0.7} 0`} fill={LEAF} {...S} strokeWidth={1.5} />
    </g>
  );
}

// ── Band 0: a potted plant that shows what it needs ─────────────────────────

/** A potted plant in a 200 × 260 box: droopy and dry (needs water), pale (needs light) or happy. */
export function NeedPlant({ need, helped, petal, puddle }: { need: Need; helped: boolean; petal: string; puddle: boolean }) {
  const droopy = need === 'water' && !helped;
  const pale = need === 'light' && !helped;
  const leaf = pale ? '#dfe59a' : LEAF;
  const stem = pale ? '#c3cf7c' : '#2fa565';
  return (
    <svg viewBox="0 0 200 260" className="garden-lab-svg" aria-hidden>
      {puddle && <ellipse className="garden-lab-puddle" cx={100} cy={250} rx={86} ry={9} fill="#8fc8ff" stroke="#3b8cff" strokeWidth={2} />}
      {droopy ? (
        <g>
          <path d="M100 182 C100 140 112 108 140 110" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d="M100 182 C100 140 112 108 140 110" fill="none" stroke={stem} strokeWidth={5} strokeLinecap="round" />
          <path d="M100 162 C86 160 70 170 64 186 C80 182 94 176 100 162Z" fill={leaf} {...S} />
          <path d="M101 146 C116 146 132 156 138 172 C122 168 108 162 101 146Z" fill={leaf} {...S} />
          <g transform="rotate(150 142 124)">
            <Petals cx={142} cy={124} r={13} n={6} colour={petal} size={0.85} />
            <circle cx={142} cy={124} r={8} fill="#ffd23f" {...S} strokeWidth={2} />
          </g>
        </g>
      ) : (
        <g className={helped ? 'garden-lab-perk' : undefined}>
          <path d="M100 182 V86" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d="M100 182 V86" stroke={stem} strokeWidth={5} strokeLinecap="round" />
          <path d="M100 152 C82 136 62 140 52 152 C66 164 86 164 100 152Z" fill={leaf} {...S} />
          <path d="M100 128 C118 112 138 116 148 128 C134 140 114 140 100 128Z" fill={leaf} {...S} />
          <g opacity={pale ? 0.6 : 1}>
            <Petals cx={100} cy={76} r={15} n={6} colour={petal} />
            <circle cx={100} cy={76} r={10} fill="#ffd23f" {...S} strokeWidth={2} />
          </g>
          {!pale && (
            <g fill={INK}>
              <circle cx={96} cy={74} r={1.8} />
              <circle cx={104} cy={74} r={1.8} />
              <path d="M95 79 Q100 83 105 79" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
            </g>
          )}
        </g>
      )}
      <path d="M52 180 H148 V196 H52 Z" fill="#f0895c" {...S} />
      <path d="M58 196 H142 L132 248 H68 Z" fill="#e07a4f" {...S} />
      <ellipse cx={100} cy={181} rx={44} ry={5} fill={droopy ? '#c9a27a' : '#6b4a2f'} />
      {droopy && <path d="M80 181 l6 3 l5 -2 M110 180 l5 3 l6 -2" fill="none" stroke="#8a6a48" strokeWidth={1.5} />}
    </svg>
  );
}

export function WateringCan({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <path d="M70 46 L94 28" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M70 46 L94 28" stroke="#3b8cff" strokeWidth={5} strokeLinecap="round" />
      <path d="M30 34 C30 18 62 18 62 34" fill="none" {...S} strokeWidth={6} />
      <path d="M20 40 H72 L68 84 Q66 90 60 90 H32 Q26 90 24 84 Z" fill="#5b9cf5" {...S} />
      <circle cx={92} cy={40} r={3} fill="#8fc8ff" />
      <circle cx={97} cy={48} r={3} fill="#8fc8ff" />
      <circle cx={89} cy={52} r={3} fill="#8fc8ff" />
    </svg>
  );
}

export function SunIcon({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d="M50 6 V20" stroke="#f59e0b" strokeWidth={6} strokeLinecap="round" transform={`rotate(${i * 45} 50 50)`} />
      ))}
      <circle cx={50} cy={50} r={22} fill="#ffd23f" {...S} />
    </svg>
  );
}

// ── Band 1: life-cycle stages ───────────────────────────────────────────────

/** One life-cycle stage of a crop, in a 100 × 100 box. */
export function StageShape({ stage, crop }: { stage: StageId; crop: Crop }) {
  const stem = (top: number) => (
    <g>
      <path d={`M50 74 V${top}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d={`M50 74 V${top}`} stroke="#2fa565" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
  const leaf = (x: number, y: number, flip: boolean, s = 1) => (
    <path
      d={`M50 ${y} c${flip ? '' : '-'}${8 * s} ${-8 * s} ${flip ? '' : '-'}${16 * s} ${-6 * s} ${flip ? '' : '-'}${20 * s} 0 c${flip ? '-' : ''}${6 * s} ${6 * s} ${flip ? '-' : ''}${14 * s} ${6 * s} ${flip ? '-' : ''}${20 * s} 0z`}
      transform={`translate(${x - 50} 0)`}
      fill={LEAF}
      {...S}
      strokeWidth={1.8}
    />
  );
  return (
    <g>
      <rect x={4} y={72} width={92} height={24} rx={8} fill={SOIL} />
      {stage === 'seed' && <ellipse cx={50} cy={84} rx={9} ry={6} fill="#c08a52" {...S} strokeWidth={2} />}
      {stage === 'sprout' && (
        <g>
          <path d="M50 84 L45 95 M50 84 L56 94" stroke="#f3e2c4" strokeWidth={2.5} strokeLinecap="round" />
          <ellipse cx={50} cy={84} rx={7} ry={4.5} fill="#c08a52" {...S} strokeWidth={1.8} />
          {stem(56)}
          <ellipse cx={42} cy={54} rx={8} ry={5} fill={LEAF} {...S} strokeWidth={1.8} transform="rotate(-20 42 54)" />
          <ellipse cx={58} cy={54} rx={8} ry={5} fill={LEAF} {...S} strokeWidth={1.8} transform="rotate(20 58 54)" />
        </g>
      )}
      {stage === 'young' && (
        <g>
          {stem(30)}
          {leaf(50, 62, false)}
          {leaf(50, 52, true)}
          {leaf(50, 42, false, 0.8)}
          {leaf(50, 34, true, 0.7)}
        </g>
      )}
      {stage === 'flower' && (
        <g>
          {stem(28)}
          {leaf(50, 62, false)}
          {leaf(50, 50, true)}
          <Petals cx={50} cy={24} r={10} n={5} colour={crop.petal} size={0.8} />
          <circle cx={50} cy={24} r={6} fill="#f59e0b" {...S} strokeWidth={1.8} />
        </g>
      )}
      {stage === 'fruit' && (
        <g>
          {stem(26)}
          {leaf(50, 62, false)}
          {leaf(50, 46, true, 0.8)}
          <Fruit cx={crop.shape === 'pod' ? 66 : 64} cy={40} r={15} colour={crop.fruit} shape={crop.shape} seeds />
        </g>
      )}
    </g>
  );
}

export function StageIcon({ stage, crop, size = 48 }: { stage: StageId; crop: Crop; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <StageShape stage={stage} crop={crop} />
    </svg>
  );
}

// ── Band 2: flowers for the bee, and a plant to label ───────────────────────

/** A flower in a 100 × 150 box that turns into fruit once pollinated. */
export function Bloom({ kind, fruit }: { kind: FlowerKind; fruit: boolean }) {
  return (
    <svg viewBox="0 0 100 150" className="garden-lab-svg" aria-hidden>
      <path d="M50 148 V58" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M50 148 V58" stroke="#2fa565" strokeWidth={4} strokeLinecap="round" />
      <path d="M50 118 C38 104 22 106 16 116 C26 126 40 126 50 118Z" fill={LEAF} {...S} />
      <path d="M50 100 C62 86 78 88 84 98 C74 108 60 108 50 100Z" fill={LEAF} {...S} />
      {fruit ? (
        <g className="garden-lab-grow">
          <Fruit cx={50} cy={48} r={20} colour={kind.fruit} shape={kind.shape} />
        </g>
      ) : (
        <g>
          <Petals cx={50} cy={46} r={17} n={kind.id === 'pea' ? 4 : 5} colour={kind.petal} size={1.15} />
          <circle cx={50} cy={46} r={10} fill={kind.centre} {...S} strokeWidth={2} />
          {[0, 90, 180, 270].map((a) => (
            <circle key={a} cx={50} cy={41} r={1.8} fill="#e0a400" transform={`rotate(${a + 45} 50 46)`} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Where each part label goes on the 300 × 420 plant. */
export const PART_SPOTS: Record<string, [number, number]> = {
  petal: [196, 74],
  stem: [150, 252],
  leaf: [86, 196],
  root: [150, 356],
};

export function PartsPlant({ petal }: { petal: string }) {
  return (
    <svg viewBox="0 0 300 420" className="garden-lab-svg" aria-hidden>
      <rect x={10} y={290} width={280} height={124} rx={18} fill="#a97b55" />
      <path d="M10 292 H290" stroke="#7cc444" strokeWidth={8} strokeLinecap="round" />
      <g fill="none" strokeLinecap="round">
        <path d="M150 292 V372 M150 316 L112 352 M150 316 L190 350 M150 340 L124 392 M150 340 L178 396 M112 352 L96 372 M190 350 L210 368" stroke={INK} strokeWidth={8} />
        <path d="M150 292 V372 M150 316 L112 352 M150 316 L190 350 M150 340 L124 392 M150 340 L178 396 M112 352 L96 372 M190 350 L210 368" stroke="#f3e2c4" strokeWidth={4} />
      </g>
      <path d="M150 294 V104" stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <path d="M150 294 V104" stroke="#2fa565" strokeWidth={9} strokeLinecap="round" />
      <path d="M150 214 C126 180 86 172 52 190 C80 222 124 226 150 214Z" fill={LEAF} {...S} strokeWidth={3} />
      <path d="M150 214 C120 200 90 194 60 192" fill="none" stroke="#1f8f55" strokeWidth={2} />
      <path d="M150 168 C174 136 214 130 246 146 C220 178 176 182 150 168Z" fill={LEAF} {...S} strokeWidth={3} />
      <path d="M150 168 C180 156 210 150 240 148" fill="none" stroke="#1f8f55" strokeWidth={2} />
      <Petals cx={150} cy={80} r={30} n={6} colour={petal} size={2} />
      <circle cx={150} cy={80} r={20} fill="#ffd23f" {...S} strokeWidth={3} />
    </svg>
  );
}

// ── Band 3: a leaf and the things that go in and out ───────────────────────

export function BigLeaf() {
  return (
    <svg viewBox="0 0 260 170" className="garden-lab-svg" aria-hidden>
      <path d="M20 150 C40 130 52 116 66 104" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M20 150 C40 130 52 116 66 104" stroke="#2fa565" strokeWidth={5} strokeLinecap="round" />
      <path d="M60 108 C70 40 160 6 246 16 C238 96 170 158 60 108Z" fill={LEAF} {...S} strokeWidth={3} />
      <path d="M62 106 C110 80 180 40 242 18" fill="none" stroke="#1f8f55" strokeWidth={3} strokeLinecap="round" />
      <path d="M100 86 L96 52 M134 66 L132 30 M170 48 L172 20 M110 82 L148 110 M146 62 L190 92 M182 44 L222 66" fill="none" stroke="#1f8f55" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** Small picture for each band-3 card. */
export function PhotoIcon({ id, size = 40 }: { id: string; size?: number }) {
  const bubble = (text: string, fill: string) => (
    <g>
      <circle cx={50} cy={50} r={36} fill={fill} {...S} strokeWidth={4} />
      <text x={50} y={60} textAnchor="middle" fontSize={30} fontWeight={700} fill={INK} fontFamily="var(--font-display)">
        {text}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      {id === 'sunlight' && (
        <g>
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M50 6 V20" stroke="#f59e0b" strokeWidth={7} strokeLinecap="round" transform={`rotate(${i * 45} 50 50)`} />
          ))}
          <circle cx={50} cy={50} r={22} fill="#ffd23f" {...S} strokeWidth={4} />
        </g>
      )}
      {id === 'water' && <path d="M50 10 C64 34 78 48 78 64 A28 28 0 0 1 22 64 C22 48 36 34 50 10Z" fill="#5b9cf5" {...S} strokeWidth={4} />}
      {id === 'co2' && bubble('CO₂', '#e6e9f0')}
      {id === 'oxygen' && bubble('O₂', '#dde9ff')}
      {id === 'sugar' && (
        <g>
          <path d="M50 14 L82 32 V68 L50 86 L18 68 V32 Z" fill="#fff4c4" {...S} strokeWidth={4} />
          <path d="M50 30 L66 40 V60 L50 70 L34 60 V40 Z" fill="none" stroke="#e0a400" strokeWidth={4} strokeLinejoin="round" />
        </g>
      )}
      {id === 'soil' && (
        <g>
          <path d="M8 80 C20 42 80 42 92 80 Z" fill="#8a5a3b" {...S} strokeWidth={4} />
          <circle cx={36} cy={66} r={3.5} fill="#5b3a22" />
          <circle cx={56} cy={58} r={3.5} fill="#5b3a22" />
          <circle cx={66} cy={72} r={3.5} fill="#5b3a22" />
        </g>
      )}
      {id === 'salt' && (
        <g>
          <path d="M50 10 C64 34 78 48 78 64 A28 28 0 0 1 22 64 C22 48 36 34 50 10Z" fill="#a9c4e6" {...S} strokeWidth={4} />
          <rect x={38} y={52} width={7} height={7} fill="white" stroke={INK} strokeWidth={1.5} />
          <rect x={54} y={62} width={7} height={7} fill="white" stroke={INK} strokeWidth={1.5} />
          <rect x={46} y={72} width={7} height={7} fill="white" stroke={INK} strokeWidth={1.5} />
        </g>
      )}
    </svg>
  );
}
