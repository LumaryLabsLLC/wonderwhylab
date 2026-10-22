import type { Story } from '../types';
import { samTheCat } from './sam-the-cat';
import { aBigPig } from './a-big-pig';
import { pipCanHop } from './pip-can-hop';
import { dotDigs } from './dot-digs';
import { maxTheFox } from './max-the-fox';
import { pamHasAMap } from './pam-has-a-map';
import { nedAndTheJug } from './ned-and-the-jug';
import { tenCups } from './ten-cups';
import { theShipAndTheFish } from './the-ship-and-the-fish';
import { puckInTheMuck } from './puck-in-the-muck';
import { katesKite } from './kates-kite';
import { juneAndJakeBake } from './june-and-jake-bake';

/** Decodable stories for ages 4–7, in order of the sounds they use. */
export const earlyStories: Story[] = [
  // Ages 4–5: CVC words with short a, i, o plus a few heart words.
  samTheCat,
  aBigPig,
  pipCanHop,
  dotDigs,
  maxTheFox,
  pamHasAMap,
  // Ages 6–7: short e and u, then blends, digraphs and magic e.
  nedAndTheJug,
  tenCups,
  theShipAndTheFish,
  puckInTheMuck,
  katesKite,
  juneAndJakeBake,
];
