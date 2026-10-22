import { C, shade } from '../../../lib/color';
import { fmt } from '../../../lib/answers';

/** A thermometer lying on its side, −10° to 10°, for question cards. */
export function ThermometerPicture({ value }: { value: number }) {
  const x0 = 80;
  const unit = 23;
  const X = (v: number) => x0 + (v + 10) * unit;
  const liquid = value < 0 ? C.blue : C.red;
  return (
    <svg viewBox="0 0 640 124" role="img" aria-label={`A thermometer showing ${fmt(value)} degrees`}>
      <rect x={44} y={38} width={X(10) - 20} height={26} rx={13} fill={C.white} stroke={C.ink} strokeWidth={2.5} />
      <rect x={44} y={45} width={X(value) - 44} height={12} rx={6} fill={liquid} />
      <circle cx={40} cy={51} r={26} fill={liquid} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={32} cy={43} r={6} fill={C.white} opacity={0.6} />
      {Array.from({ length: 21 }, (_, i) => {
        const v = i - 10;
        const major = v % 5 === 0;
        return (
          <g key={v}>
            <line x1={X(v)} y1={68} x2={X(v)} y2={major ? 86 : 78} stroke={C.ink} strokeWidth={major ? 3 : 1.8} />
            {major && (
              <text x={X(v)} y={114} textAnchor="middle" fontSize={26} fontWeight={v === 0 ? 700 : 600} fill={v === 0 ? C.ink : shade(C.ink, 0.15)}>
                {fmt(v)}
              </text>
            )}
          </g>
        );
      })}
      <path d={`M${X(value)},30 l-8,-12 h16 z`} fill={C.ink} />
    </svg>
  );
}
