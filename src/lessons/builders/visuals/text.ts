/**
 * Word-wrap for SVG text. Splits only on ordinary spaces, so a phrase joined with
 * non-breaking spaces (e.g. "45 > 38") always stays on one line.
 */
export function wrapLines(text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    if (line && (line + ' ' + w).length > max) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}

/** Glue "45 > 38" style comparisons together so they never break across lines. */
export const keepTogether = (s: string) => s.replace(/(\d+) ([<>=]) (\d+)/g, '$1 $2 $3');
