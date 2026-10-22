/**
 * Normalise an answer string so "−3", "-3 ", "03" and "3.0" compare sensibly.
 * Letter case is kept: some answers differ only by case (e.g. alleles "Pp" vs "pp").
 */
export function normalizeAnswer(value: string): string {
  const cleaned = value.trim().replace(/[−–]/g, '-').replace(/\s+/g, ' ');
  if (/^-?\d*\.?\d+$/.test(cleaned)) return String(Number(cleaned));
  return cleaned;
}

export function isCorrect(given: string, answer: string): boolean {
  return normalizeAnswer(given) === normalizeAnswer(answer);
}

/** Pretty-print a number for kids: real minus sign, no float noise. */
export function fmt(n: number): string {
  const s = String(Math.round(n * 1e6) / 1e6);
  return s.replace('-', '−');
}
