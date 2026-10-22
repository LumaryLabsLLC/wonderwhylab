/**
 * Every game, loaded at once. Only tests and the catalog generator import this:
 * the app loads each game's code when it is opened, through ./index.ts.
 */
import type { Game } from './types';
import { game as bubblePop } from './bubble-pop';
import { game as memoryMatch } from './memory-match';
import { game as rocketRace } from './rocket-race';
import { game as feedMonster } from './feed-monster';
import { game as numberLineJump } from './number-line-jump';
import { game as sortIt } from './sort-it';
import { game as abcTrain } from './abc-train';
import { game as letterFishing } from './letter-fishing';
import { game as firstSounds } from './first-sounds';
import { game as wordBuilder } from './word-builder';
import { game as readMatch } from './read-match';
import { game as rhymeTime } from './rhyme-time';
import { game as soundItOut } from './sound-it-out';
import { game as quickLook } from './quick-look';
import { game as balanceLab } from './balance-lab';
import { game as launchLab } from './launch-lab';
import { game as circuitBuilder } from './circuit-builder';
import { game as potionLab } from './potion-lab';
import { game as moleculeBuilder } from './molecule-builder';
import { game as habitatRescue } from './habitat-rescue';
import { game as bodyBuilder } from './body-builder';
import { game as gardenLab } from './garden-lab';
import { game as tangramBuilder } from './tangram-builder';
import { game as fractionCafe } from './fraction-cafe';
import { game as sentenceBuilder } from './sentence-builder';
import { game as storyDetective } from './story-detective';

export const GAMES: Game[] = [
  quickLook,
  bubblePop,
  rocketRace,
  memoryMatch,
  feedMonster,
  numberLineJump,
  sortIt,
  tangramBuilder,
  fractionCafe,
  soundItOut,
  abcTrain,
  letterFishing,
  firstSounds,
  wordBuilder,
  readMatch,
  rhymeTime,
  sentenceBuilder,
  storyDetective,
  balanceLab,
  launchLab,
  circuitBuilder,
  potionLab,
  moleculeBuilder,
  habitatRescue,
  bodyBuilder,
  gardenLab,
];
