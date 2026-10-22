import { C, shade } from '../../../lib/color';

const GREEN = '#5bb36a';

/**
 * A friendly crocodile head whose mouth is the comparison sign.
 * The hinge sits at (0, 0); with `facing` = 1 the jaws open to the right (left < right).
 * `open` is the half-angle of the mouth in degrees. `cx` shifts the drawing left so the head is centred.
 */
export function Croc({ open = 24, facing = 1, scale = 1, cx = 0 }: { open?: number; facing?: 1 | -1; scale?: number; cx?: number }) {
  const jaw = (upper: boolean) => {
    const s = upper ? -1 : 1;
    return (
      <g style={{ transform: `rotate(${s * open}deg)`, transition: 'transform 0.4s cubic-bezier(0.3, 1.5, 0.5, 1)' }}>
        <path
          d={`M-6,${s * 30} C40,${s * 44} 118,${s * 34} 158,${s * 16} C168,${s * 11} 166,0 156,0 L-6,0 Z`}
          fill={upper ? GREEN : shade(GREEN, -0.12)}
          stroke={C.ink}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {[34, 62, 90, 118].map((x) => (
          <path key={x} d={`M${x - 8},0 L${x + 8},0 L${x},${-s * 11}`} fill={C.white} stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" />
        ))}
        {upper ? (
          <g>
            <circle cx={140} cy={-17} r={3} fill={C.ink} />
            {[40, 70, 100].map((x) => (
              <circle key={x} cx={x} cy={-24} r={3.4} fill={shade(GREEN, -0.25)} />
            ))}
          </g>
        ) : (
          [50, 86].map((x) => <circle key={x} cx={x} cy={22} r={3.4} fill={shade(GREEN, -0.3)} />)
        )}
      </g>
    );
  };
  return (
    <g style={{ transform: `scale(${facing * scale}, ${scale})`, transition: 'transform 0.45s ease' }}>
      <g transform={`translate(${-cx} 0)`}>
      <circle cx={-14} cy={0} r={40} fill={GREEN} stroke={C.ink} strokeWidth={3} />
      {jaw(false)}
      {jaw(true)}
      {/* eye on top of the head */}
      <g style={{ transform: `rotate(${-open}deg)`, transition: 'transform 0.4s cubic-bezier(0.3, 1.5, 0.5, 1)' }}>
        <circle cx={8} cy={-38} r={15} fill={C.white} stroke={C.ink} strokeWidth={3} />
        <circle cx={12} cy={-38} r={6} fill={C.ink} />
        <circle cx={14} cy={-41} r={2} fill={C.white} />
      </g>
      </g>
    </g>
  );
}
