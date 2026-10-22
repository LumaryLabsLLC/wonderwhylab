/** Kid palette used by every scene so lessons feel like one set of toys. */
export const C = {
  ink: '#1e2b4a',
  ink2: '#3b4766',
  muted: '#66708a',
  paper: '#e4effb',
  card: '#ffffff',
  line: '#c8d9ec',
  teal: '#1aa39a',
  red: '#e8604c',
  orange: '#f2994a',
  yellow: '#f5c542',
  green: '#4cb07a',
  blue: '#3d7fd6',
  purple: '#8b67d6',
  pink: '#e46fa6',
  brown: '#a8743f',
  wood: '#e3c393',
  white: '#ffffff',
} as const;

export const RAINBOW = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple, C.pink] as const;

/** Lighten (amount > 0) or darken (amount < 0) a hex colour. amount is -1..1. */
export function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  const channels = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((c) => {
    const target = amount < 0 ? 0 : 255;
    return Math.round(c + (target - c) * Math.abs(amount));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
