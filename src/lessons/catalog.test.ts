import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODULES as FULL } from './all';
import { CATALOG } from './catalog';
import { loadModule } from './index';
import type { ModuleInfo } from './types';

/**
 * The catalog is the lessons' names and order, kept apart from their code so the app can start small.
 * It is generated from the lesson files: after adding, renaming or reordering lessons run
 *   npm run catalog
 */
const expected: ModuleInfo[] = FULL.map(({ id, subject, band, title, ages, color, blurb, lessons }) => ({
  id,
  subject,
  band,
  title,
  ages,
  color,
  blurb,
  lessons: lessons.map((l) => ({ id: l.id, title: l.title })),
}));

/** Pretty JSON, but with each lesson on one line. */
const compact = (value: unknown) =>
  JSON.stringify(value, null, 2).replace(/\{\n\s+"id": ("[^"]*"),\n\s+"title": ("[^"]*")\n\s+\}/g, '{ "id": $1, "title": $2 }');

describe('lesson catalog', () => {
  it('matches the lesson files (run `npm run catalog` if this fails)', () => {
    if (process.env.WRITE_CATALOG) {
      writeFileSync(
        new URL('./catalog.ts', import.meta.url),
        `// Generated from the lesson files by \`npm run catalog\`. Don't edit by hand: run that command after
// adding, renaming or reordering lessons (\`npm test\` fails until you do).
import type { ModuleInfo } from './types';

export const CATALOG: ModuleInfo[] = ${compact(expected)};
`,
      );
      return;
    }
    expect(CATALOG).toEqual(expected);
  });

  it('can load every module on demand, with its lessons in catalog order', async () => {
    for (const info of CATALOG) {
      const module = await loadModule(info.id);
      expect(module.id).toBe(info.id);
      expect(module.lessons.map((l) => l.id)).toEqual(info.lessons.map((l) => l.id));
    }
  });
});
