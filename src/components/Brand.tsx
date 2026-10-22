const INK = '#1e2b4a';

/** Round badge: four coloured quarters (one per subject spark) around a big "why?" question mark. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <circle cx={33} cy={35} r={28} fill={INK} />
      <path d="M32 32 V4 A28 28 0 0 0 4 32 Z" fill="#ff6b5b" />
      <path d="M32 32 V4 A28 28 0 0 1 60 32 Z" fill="#3b8cff" />
      <path d="M32 32 H4 A28 28 0 0 0 32 60 Z" fill="#ffd23f" />
      <path d="M32 32 H60 A28 28 0 0 1 32 60 Z" fill="#34c47c" />
      <circle cx={32} cy={32} r={28} fill="none" stroke={INK} strokeWidth={3.5} />
      <circle cx={32} cy={32} r={17} fill="white" stroke={INK} strokeWidth={3} />
      <path
        d="M26 27.5c0-3.6 2.8-6 6.3-6s6.2 2.3 6.2 5.6c0 2.6-1.6 3.9-3.4 5-1.6 1-2.6 1.8-2.6 3.6v.8"
        fill="none"
        stroke={INK}
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={32.5} cy={42.2} r={2.4} fill={INK} />
    </svg>
  );
}

const LETTERS: [string, string][] = [
  ['W', '#ff6b5b'],
  ['o', '#ff9f43'],
  ['n', '#e0b11a'],
  ['d', '#34c47c'],
  ['e', '#3b8cff'],
  ['r', '#8b5cf6'],
];

export function Wordmark() {
  return (
    <span className="wordmark">
      <span className="wordmark-wonder" aria-label="Wonder">
        {LETTERS.map(([ch, color], i) => (
          <span key={i} style={{ color }} aria-hidden>
            {ch}
          </span>
        ))}
      </span>{' '}
      Why Lab
    </span>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <Logo className="brand-logo" />
      <Wordmark />
    </span>
  );
}
