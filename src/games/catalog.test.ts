import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GAMES as FULL } from './all';
import { GAME_CATALOG } from './catalog';
import { loadGame } from './index';
import type { GameInfo } from './types';

/**
 * The catalog is the games' names, icons and colours, kept apart from their code so the app can start
 * small. It is generated from the game files: after adding or changing a game's details run
 *   npm run catalog
 */
const expected: GameInfo[] = FULL.map(({ Play: _play, ...info }) => info);

/** Source for one catalog entry; icons are written as the lucide-react components they are. */
function entry(g: GameInfo): string {
  const lines = Object.entries(g).map(([key, value]) =>
    key === 'icon' ? `    icon: ${iconName(g)},` : `    ${key}: ${JSON.stringify(value)},`,
  );
  return `  {\n${lines.join('\n')}\n  }`;
}

function iconName(g: GameInfo): string {
  const name = (g.icon as { displayName?: string }).displayName;
  if (!name) throw new Error(`The icon of "${g.id}" has no name; use a lucide-react icon.`);
  return name;
}

describe('game catalog', () => {
  it('matches the game files (run `npm run catalog` if this fails)', () => {
    if (process.env.WRITE_CATALOG) {
      const icons = [...new Set(expected.map(iconName))].sort();
      writeFileSync(
        new URL('./catalog.ts', import.meta.url),
        `// Generated from the game files by \`npm run catalog\`. Don't edit by hand: run that command after
// adding a game or changing its title, blurb, colour or icon (\`npm test\` fails until you do).
import { ${icons.join(', ')} } from 'lucide-react';
import type { GameInfo } from './types';

export const GAME_CATALOG: GameInfo[] = [
${expected.map(entry).join(',\n')},
];
`,
      );
      return;
    }
    expect(GAME_CATALOG.map((g) => ({ ...g, icon: iconName(g) }))).toEqual(expected.map((g) => ({ ...g, icon: iconName(g) })));
  });

  it('can load every game on demand', async () => {
    for (const info of GAME_CATALOG) {
      const game = await loadGame(info.id);
      expect(game.id).toBe(info.id);
      expect(typeof game.Play).toBe('function');
    }
  });
});
