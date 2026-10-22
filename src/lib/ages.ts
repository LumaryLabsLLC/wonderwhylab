/**
 * Age groups drive the whole look and feel: younger children get bigger targets, warmer colours,
 * chunkier shapes and fewer words; older children get a calmer, more grown-up design.
 * The CSS themes live under `.app[data-age="n"]` in src/styles/app.css.
 */
export interface AgeGroup {
  band: 0 | 1 | 2 | 3;
  label: string;
  /** Friendly name shown on the age picker. */
  name: string;
  /** Theme accent, used for previews outside the themed app root. */
  color: string;
  soft: string;
}

export const AGES: AgeGroup[] = [
  { band: 0, label: '4–5', name: 'Little explorers', color: '#ff9f1c', soft: '#fff1d6' },
  { band: 1, label: '6–7', name: 'Busy builders', color: '#22b573', soft: '#dcf7e8' },
  { band: 2, label: '8–9', name: 'Bold discoverers', color: '#3b82f6', soft: '#dde9ff' },
  { band: 3, label: '10–12', name: 'Young scientists', color: '#6d5bd0', soft: '#e9e5fb' },
];

export const ageOf = (band: number) => AGES[Math.min(3, Math.max(0, band))];
