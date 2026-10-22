import type { Band } from '../types';
import { shuffle } from '../../lib/random';

/**
 * Story Detective content. Comprehension with evidence: the child first finds the sentence that
 * proves the answer (drag the magnifying glass onto it), then picks the answer.
 *
 * - Band 0 (pre-readers): picture stories — put three pictures in order, then answer a
 *   who/what question by tapping something in a picture. Captions are read aloud only on a tap.
 * - Band 1: 2–4 sentence stories with who / what / where questions.
 * - Band 2: sequencing and "why" questions.
 * - Band 3: inference (feelings, setting, motive) and the author's purpose, with evidence.
 *
 * All passages are original. Levels 0–2 within a band get a little harder.
 */

export interface Question {
  ask: string;
  /** Sentence numbers (0-based) that prove the answer. Any of them counts. */
  evidence: number[];
  answer: string;
  /** Wrong answers (2). */
  others: string[];
  /** Nudge after a wrong clue: where to look, without giving it away. */
  look: string;
  /** "Show me" line: why the clue proves the answer. */
  because: string;
}

export interface Passage {
  id: string;
  sentences: string[];
  questions: Question[];
}

export interface Frame {
  /** Emoji pieces of the picture. In the question frame, each one can be tapped. */
  scene: string[];
  /** Short caption, read aloud on a tap. */
  caption: string;
}

export interface PictureStory {
  id: string;
  frames: [Frame, Frame, Frame];
  question: {
    ask: string;
    frame: number;
    answer: string;
    /** Spoken name of the answer, e.g. "a bee". */
    name: string;
  };
}

export type Round =
  | { kind: 'pictures'; id: string; level: number; story: PictureStory; order: number[]; prefilled: number }
  | { kind: 'text'; id: string; level: number; passage: Passage; question: Question; choices: string[] };

export const ROUNDS = 6;

const q = (ask: string, evidence: number | number[], answer: string, others: string[], look: string, because: string): Question => ({
  ask,
  evidence: Array.isArray(evidence) ? evidence : [evidence],
  answer,
  others,
  look,
  because,
});

const p = (id: string, sentences: string[], questions: Question[]): Passage => ({ id, sentences, questions });

const f = (caption: string, ...scene: string[]): Frame => ({ caption, scene });

/** Band 0 picture stories, by level. */
export const PICTURE_STORIES: PictureStory[][] = [
  [
    {
      id: 'ps-plant',
      frames: [f('Dig a hole.', '👧', '🕳️'), f('Water the seed.', '👧', '💧', '🌱'), f('A flower grows!', '🌻', '🐝', '☀️')],
      question: { ask: 'What came to the flower?', frame: 2, answer: '🐝', name: 'a bee' },
    },
    {
      id: 'ps-snow',
      frames: [f('Snow falls.', '☁️', '❄️'), f('Roll big snowballs.', '🧒', '⚪'), f('A snowman!', '⛄', '🧣', '🥕')],
      question: { ask: 'What is the snowman’s nose?', frame: 2, answer: '🥕', name: 'a carrot' },
    },
    {
      id: 'ps-lunch',
      frames: [f('Wash your hands.', '🧼', '🚰'), f('Make a sandwich.', '🍞', '🧀'), f('Eat it up!', '🥪', '😋', '🥛')],
      question: { ask: 'What did they eat?', frame: 2, answer: '🥪', name: 'a sandwich' },
    },
  ],
  [
    {
      id: 'ps-rain',
      frames: [f('Clouds come.', '☁️', '🌤️'), f('It rains.', '🌧️', '☔'), f('After the rain.', '🌈', '🐌', '🌼')],
      question: { ask: 'What is in the sky after the rain?', frame: 2, answer: '🌈', name: 'a rainbow' },
    },
    {
      id: 'ps-party',
      frames: [f('Mix and bake.', '🥣', '🥚'), f('Put on candles.', '🎂', '🕯️'), f('Happy birthday!', '🎈', '🎁', '🐶')],
      question: { ask: 'Who came to the party?', frame: 2, answer: '🐶', name: 'the dog' },
    },
    {
      id: 'ps-egg',
      frames: [f('An egg in the straw.', '🥚', '🌾'), f('It cracks!', '🐣'), f('A chick!', '🐥', '🐔', '🌽')],
      question: { ask: 'Who is the chick’s mom?', frame: 2, answer: '🐔', name: 'the hen' },
    },
  ],
  [
    {
      id: 'ps-bath',
      frames: [f('Fill the bath.', '🛁', '💧'), f('Get the sponge.', '🧽', '🧴'), f('Splash!', '🦆', '🛁', '😄')],
      question: { ask: 'What toy is in the bath?', frame: 2, answer: '🦆', name: 'a duck' },
    },
    {
      id: 'ps-bed',
      frames: [f('Brush your teeth.', '🦷', '🚰'), f('Read a story.', '📖', '🧸', '🕯️'), f('Sleep tight.', '🛏️', '🌙', '⭐')],
      question: { ask: 'What do you hug while you read?', frame: 1, answer: '🧸', name: 'the teddy bear' },
    },
    {
      id: 'ps-picnic',
      frames: [f('Pack a basket.', '🧺', '🍎'), f('Walk to the park.', '🌳', '🚶'), f('Ants came too!', '🐜', '🍉', '🧺')],
      question: { ask: 'Who came to the picnic?', frame: 2, answer: '🐜', name: 'the ants' },
    },
  ],
];

/** Text passages for bands 1–3, by band then level. */
export const PASSAGES: Passage[][][] = [
  [],
  // Band 1 — who / what / where
  [
    [
      p('p1-hen', ['Pip is a little red hen.', 'Pip finds a big worm.'], [
        q('Who finds a worm?', 1, 'Pip', ['a cat', 'a frog'], 'Look for the sentence about the worm.', '“Pip finds a big worm.” So Pip found it.'),
        q('What color is Pip?', 0, 'red', ['blue', 'green'], 'Look for the sentence that tells what Pip looks like.', '“Pip is a little red hen.” So Pip is red.'),
      ]),
      p('p1-kite', ['Tom has a blue kite.', 'The kite is up in the sky.'], [
        q('What does Tom have?', 0, 'a kite', ['a ball', 'a dog'], 'Find the sentence that starts with Tom.', '“Tom has a blue kite.” So Tom has a kite.'),
        q('Where is the kite?', 1, 'in the sky', ['in a tree', 'in a box'], 'Find the sentence that tells where the kite is.', '“The kite is up in the sky.”'),
      ]),
      p('p1-pond', ['Liz and her dad go to the pond.', 'They see six ducks.'], [
        q('Who goes to the pond?', 0, 'Liz and her dad', ['Liz and her mom', 'Tom'], 'Find the sentence about the pond.', '“Liz and her dad go to the pond.”'),
        q('What do they see?', 1, 'six ducks', ['six fish', 'a frog'], 'Find the sentence that tells what they see.', '“They see six ducks.”'),
      ]),
      p('p1-fox', ['A fox naps in the sun.', 'A bug lands on its nose.'], [
        q('Where does the fox nap?', 0, 'in the sun', ['in a den', 'in the rain'], 'Find the sentence about the nap.', '“A fox naps in the sun.”'),
        q('What lands on the fox?', 1, 'a bug', ['a bird', 'a leaf'], 'Find the sentence about something landing.', '“A bug lands on its nose.”'),
      ]),
    ],
    [
      p('p1-cap', ['Max lost his red cap.', 'He looked under his bed.', 'The cap was in the bath!'], [
        q('Where was the cap?', 2, 'in the bath', ['under the bed', 'in the van'], 'Find the sentence that tells where the cap really was.', '“The cap was in the bath!” Max looked under the bed, but it was not there.'),
        q('What did Max lose?', 0, 'his cap', ['his bag', 'his dog'], 'Find the sentence about losing something.', '“Max lost his red cap.”'),
      ]),
      p('p1-shop', ['Nell went to the shop with her mom.', 'They got milk and eggs.', 'Nell held the bag.'], [
        q('What did they get?', 1, 'milk and eggs', ['jam and bread', 'a toy'], 'Find the sentence about what they got.', '“They got milk and eggs.”'),
        q('Who held the bag?', 2, 'Nell', ['her mom', 'her dad'], 'Find the sentence about the bag.', '“Nell held the bag.”'),
      ]),
      p('p1-snail', ['A snail went up a tall wall.', 'It was very slow.', 'At the top, it saw a leaf.'], [
        q('Where did the snail go?', 0, 'up a wall', ['into a pond', 'down a hole'], 'Find the sentence that tells where the snail went.', '“A snail went up a tall wall.”'),
        q('What did the snail see at the top?', 2, 'a leaf', ['a bird', 'a cat'], 'Find the sentence about the top.', '“At the top, it saw a leaf.”'),
      ]),
      p('p1-fish', ['Ravi has a pet fish.', 'It is gold and fat.', 'It swims in a bowl on his desk.'], [
        q('Where does the fish swim?', 2, 'in a bowl', ['in a pond', 'in the sea'], 'Find the sentence about swimming.', '“It swims in a bowl on his desk.”'),
        q('What color is the fish?', 1, 'gold', ['red', 'black'], 'Find the sentence that tells what the fish looks like.', '“It is gold and fat.”'),
      ]),
    ],
    [
      p('p1-sand', ['Ana and Ben made a sandcastle.', 'A big wave came and hit it.', 'Ben was sad, but Ana got her bucket.', 'They made it again, even bigger.'], [
        q('What hit the sandcastle?', 1, 'a wave', ['a ball', 'a dog'], 'Find the sentence where something hits the castle.', '“A big wave came and hit it.” “It” means the sandcastle.'),
        q('Who got a bucket?', 2, 'Ana', ['Ben', 'Mom'], 'Find the sentence about the bucket.', '“Ben was sad, but Ana got her bucket.”'),
      ]),
      p('p1-farm', ['The class went to the farm.', 'They fed the goats.', 'One goat ate Jen’s hat!', 'Everyone laughed.'], [
        q('What did the goat eat?', 2, 'Jen’s hat', ['some grass', 'a carrot'], 'Find the sentence about the goat eating.', '“One goat ate Jen’s hat!”'),
        q('Where did the class go?', 0, 'to the farm', ['to the zoo', 'to the park'], 'Find the sentence about where they went.', '“The class went to the farm.”'),
      ]),
      p('p1-kit', ['Kit the cat sat by the door.', 'She wanted to go out.', 'When Gran came home, Kit ran into the yard.'], [
        q('Who came home?', 2, 'Gran', ['Kit', 'Dad'], 'Find the sentence about coming home.', '“When Gran came home, Kit ran into the yard.”'),
        q('Who wanted to go out?', [0, 1], 'Kit', ['Gran', 'a dog'], 'Find the sentence about wanting to go out.', '“She wanted to go out.” “She” means Kit the cat.'),
      ]),
      p('p1-pancake', ['Dad made pancakes.', 'He put jam on top.', 'Sam ate three of them.'], [
        q('Who put jam on top?', 1, 'Dad', ['Sam', 'Mom'], 'Find the sentence about the jam.', '“He put jam on top.” “He” means Dad, who made the pancakes.'),
        q('How many pancakes did Sam eat?', 2, 'three', ['one', 'six'], 'Find the sentence about Sam.', '“Sam ate three of them.”'),
      ]),
    ],
  ],
  // Band 2 — sequencing and why
  [
    [
      p('p2-seed', ['First, Mia filled a pot with soil.', 'Next, she pressed a seed into it.', 'Then she watered it every day.', 'Finally, a green shoot popped up.'], [
        q('What did Mia do right after she filled the pot?', 1, 'pressed in a seed', ['watered it', 'picked a flower'], 'Signal words like “first” and “next” show the order.', '“Next, she pressed a seed into it.” “Next” comes right after “first”.'),
        q('What happened at the end?', 3, 'a green shoot popped up', ['she filled a pot', 'it rained'], 'Which signal word means “at the end”?', '“Finally, a green shoot popped up.” “Finally” tells you it was last.'),
      ]),
      p('p2-snack', ['Leo wanted a snack.', 'First, he washed his hands.', 'Then he cut an apple into slices.', 'Last, he shared them with his sister.'], [
        q('What did Leo do before he cut the apple?', 1, 'washed his hands', ['shared the slices', 'ate a pear'], 'Find what happened just before the apple was cut.', '“First, he washed his hands.” Then he cut the apple.'),
        q('What did Leo do last?', 3, 'shared the slices', ['washed his hands', 'cut the apple'], 'Look for the signal word that means “at the end”.', '“Last, he shared them with his sister.”'),
      ]),
      p('p2-match', ['Before the match, the team warmed up.', 'After that, they played two halves.', 'At the end, they shook hands with the other team.'], [
        q('What did the team do at the end?', 2, 'shook hands', ['warmed up', 'ate lunch'], 'Look for the words that mean the very end.', '“At the end, they shook hands with the other team.”'),
        q('What did the team do first?', 0, 'warmed up', ['shook hands', 'played two halves'], 'Look for the word “before”.', '“Before the match, the team warmed up.”'),
      ]),
      p('p2-letter', ['Zoe wrote a letter to her grandma.', 'Then she folded it and put it in an envelope.', 'After that, she walked to the post box with her dad.'], [
        q('What did Zoe do after folding the letter?', 1, 'put it in an envelope', ['wrote it', 'read a book'], 'Find the sentence about folding.', '“Then she folded it and put it in an envelope.”'),
        q('Who went with Zoe to the post box?', 2, 'her dad', ['her grandma', 'her friend'], 'Find the sentence about the post box.', '“After that, she walked to the post box with her dad.”'),
      ]),
    ],
    [
      p('p2-umbrella', ['Leo grabbed his umbrella as he left.', 'Dark clouds filled the sky.', 'By lunchtime, rain poured down.'], [
        q('Why did Leo take his umbrella?', 1, 'dark clouds were in the sky', ['it was sunny', 'he was cold'], 'Find the clue about the weather.', '“Dark clouds filled the sky.” Dark clouds often bring rain.'),
        q('What happened by lunchtime?', 2, 'it rained hard', ['the sun came out', 'it snowed'], 'Find the sentence about lunchtime.', '“By lunchtime, rain poured down.”'),
      ]),
      p('p2-bakery', ['The bakery shut early on Monday.', 'Its oven had broken.', 'A repair worker fixed it the next day.'], [
        q('Why did the bakery shut early?', 1, 'the oven broke', ['it ran out of flour', 'it was a holiday'], 'Find the sentence that gives a reason.', '“Its oven had broken.” A bakery can’t bake without an oven.'),
        q('When was the oven fixed?', 2, 'the next day', ['the same day', 'a week later'], 'Find the sentence about the repair.', '“A repair worker fixed it the next day.”'),
      ]),
      p('p2-race', ['Priya trained hard for the race.', 'She ran every morning before school.', 'On race day, she beat her best time.'], [
        q('Why did Priya beat her best time?', [0, 1], 'she trained hard', ['she had new shoes', 'the race was short'], 'Find what Priya did before race day.', '“Priya trained hard for the race.” Practice made her faster.'),
        q('When did Priya run?', 1, 'every morning', ['every night', 'only on Sundays'], 'Find the sentence about when she ran.', '“She ran every morning before school.”'),
      ]),
      p('p2-library', ['Omar’s library book was due on Friday.', 'He read two chapters every night.', 'He finished it on Thursday and returned it on time.'], [
        q('Why did Omar finish on time?', 1, 'he read every night', ['the book was short', 'his mom read it'], 'Find what Omar did each night.', '“He read two chapters every night.” A little each night added up.'),
        q('When was the book due?', 0, 'on Friday', ['on Monday', 'on Thursday'], 'Find the sentence about the due day.', '“Omar’s library book was due on Friday.”'),
      ]),
    ],
    [
      p('p2-frogs', ['The pond was full of tadpoles in spring.', 'By summer, Omar spotted tiny frogs hopping on the bank.', 'The tadpoles had grown legs and lost their tails.'], [
        q('Why were there frogs by summer?', 2, 'the tadpoles grew into frogs', ['frogs came from another pond', 'Omar bought some frogs'], 'Find the sentence that explains the change.', '“The tadpoles had grown legs and lost their tails.” Tadpoles turn into frogs.'),
        q('When was the pond full of tadpoles?', 0, 'in spring', ['in winter', 'in summer'], 'Find the sentence about the tadpoles.', '“The pond was full of tadpoles in spring.”'),
      ]),
      p('p2-plants', ['Nina’s tomato plants were drooping.', 'She had forgotten to water them all week.', 'After a long drink, they stood up straight again.'], [
        q('Why were the plants drooping?', 1, 'they needed water', ['they needed shade', 'it was too cold'], 'Find what Nina forgot.', '“She had forgotten to water them all week.” Plants droop when they are thirsty.'),
        q('What helped the plants stand up again?', 2, 'water', ['sunlight', 'a new pot'], 'Find the sentence about the plants getting better.', '“After a long drink, they stood up straight again.”'),
      ]),
      p('p2-path', ['The town built a new bike path to the station.', 'Now more people cycle to work instead of driving.', 'The streets are quieter in the mornings.'], [
        q('Why are the streets quieter?', 1, 'fewer people drive', ['the station closed', 'it rained'], 'Find the sentence about how people travel now.', '“Now more people cycle to work instead of driving.” Fewer cars means quieter streets.'),
        q('What did the town build?', 0, 'a bike path', ['a new road', 'a train station'], 'Find the sentence about building.', '“The town built a new bike path to the station.”'),
      ]),
      p('p2-dough', ['Sara left the bread dough in a warm spot.', 'An hour later, it had grown to twice its size.', 'The yeast had made tiny bubbles of gas inside it.'], [
        q('Why did the dough grow?', 2, 'the yeast made gas bubbles', ['Sara added more flour', 'it got cold'], 'Find the sentence that explains what happened inside the dough.', '“The yeast had made tiny bubbles of gas inside it.” The bubbles puffed it up.'),
        q('Where did Sara leave the dough?', 0, 'in a warm spot', ['in the fridge', 'outside'], 'Find the first sentence.', '“Sara left the bread dough in a warm spot.”'),
      ]),
    ],
  ],
  // Band 3 — inference and author's purpose
  [
    [
      p('p3-stage', ['Ana’s hands shook as she walked onto the stage.', 'She took a deep breath and looked at her notes.', 'Her voice was quiet at first.'], [
        q('How did Ana feel?', [0, 2], 'nervous', ['bored', 'angry'], 'Look for clues about Ana’s body and voice.', 'Shaking hands and a quiet voice are signs of feeling nervous.'),
        q('What did Ana do to calm down?', 1, 'took a deep breath', ['ran away', 'sang a song'], 'Find what Ana did before she spoke.', '“She took a deep breath and looked at her notes.”'),
      ]),
      p('p3-team', ['Jamal burst through the door and threw his bag in the air.', '“I made the team!” he shouted.'], [
        q('How did Jamal feel?', [0, 1], 'thrilled', ['worried', 'sleepy'], 'Look at what Jamal did and said.', 'Throwing his bag in the air and shouting the news show he was thrilled.'),
        q('Why did he feel that way?', 1, 'he made the team', ['he lost his bag', 'school was closed'], 'Find what Jamal shouted.', '“I made the team!” That is why he was so happy.'),
      ]),
      p('p3-picnic', ['Lily stared out of the window as the rain fell.', 'Her friends had cancelled the picnic.', 'She sighed and put the basket away.'], [
        q('How did Lily feel?', [0, 2], 'disappointed', ['excited', 'scared'], 'Look at what Lily did.', 'Staring at the rain and sighing as she put the basket away show she was disappointed.'),
        q('Why was the picnic most likely cancelled?', 0, 'because of the rain', ['because Lily was ill', 'because the basket broke'], 'Which sentence describes the weather?', '“Lily stared out of the window as the rain fell.” Rain spoils picnics.'),
      ]),
      p('p3-puppy', ['Theo knelt down and held out his hand.', 'The puppy crept closer, its tail low.', 'After a moment, it licked his fingers and its tail began to wag.'], [
        q('How did the puppy feel at first?', 1, 'shy', ['angry', 'sleepy'], 'Look at how the puppy moved at the start.', 'Creeping slowly with a low tail shows the puppy was shy at first.'),
        q('How did the puppy feel by the end?', 2, 'friendly', ['frightened', 'hungry'], 'Look at what the puppy did at the end.', 'Licking his fingers and wagging its tail show it felt friendly.'),
      ]),
    ],
    [
      p('p3-beach', ['Sand crunched between Leo’s toes.', 'Gulls cried overhead, and salty spray hit his face.'], [
        q('Where was Leo?', [0, 1], 'at the beach', ['in a forest', 'in a library'], 'Look for clues you could feel and hear.', 'Sand, gulls and salty spray are all clues for the beach.'),
        q('What could Leo hear?', 1, 'gulls', ['traffic', 'music'], 'Find the sentence with a sound in it.', '“Gulls cried overhead.”'),
      ]),
      p('p3-winter', ['Grandpa pulled on his thick coat and wrapped a scarf around his neck.', 'He grabbed the shovel by the door.', 'Outside, everything was white.'], [
        q('What season was it?', [0, 2], 'winter', ['summer', 'spring'], 'Look for clues about clothes and the view outside.', 'A thick coat, a scarf and everything white outside point to winter snow.'),
        q('What was Grandpa going to do?', [1, 2], 'shovel snow', ['plant seeds', 'go swimming'], 'What did Grandpa pick up, and what was outside?', 'He grabbed a shovel and everything outside was white, so he was going to shovel snow.'),
      ]),
      p('p3-museum', ['Mo checked the clock again.', 'The museum closed at five, and it was already 4:45.', 'He began to walk faster.'], [
        q('Why did Mo walk faster?', 1, 'the museum was closing soon', ['he was late for school', 'it was raining'], 'Find the sentence about time.', 'The museum closed at five and it was 4:45, so Mo had only 15 minutes.'),
        q('How was Mo probably feeling?', [0, 2], 'in a hurry', ['relaxed', 'sleepy'], 'Look at what Mo kept doing.', 'Checking the clock again and walking faster show he was in a hurry.'),
      ]),
      p('p3-cave', ['Kai’s torch flickered and went out.', 'Water dripped somewhere in the dark, and the air smelled damp and cold.'], [
        q('Where was Kai?', [0, 1], 'in a cave', ['on a sunny hill', 'in a kitchen'], 'Look for clues about light, sound and smell.', 'Darkness, dripping water and damp, cold air are clues for a cave.'),
        q('What problem did Kai have?', 0, 'his torch went out', ['he was hungry', 'he lost his map'], 'Find the first sentence.', '“Kai’s torch flickered and went out.”'),
      ]),
    ],
    [
      p('p3-swim', ['Every child should learn to swim.', 'Swimming keeps you safe near water.', 'It is also great exercise.', 'Ask your school about lessons today!'], [
        q('Why did the author write this?', [0, 3], 'to persuade', ['to entertain', 'to tell a story'], 'Look for words like “should” and for a request to the reader.', '“Every child should learn to swim” and “Ask your school about lessons today!” try to convince you.'),
        q('Which reason does the author give?', [1, 2], 'it keeps you safe', ['it is easy', 'it is cheap'], 'Find a sentence that gives a reason to swim.', '“Swimming keeps you safe near water.”'),
      ]),
      p('p3-octopus', ['Octopuses have three hearts and blue blood.', 'They can change color in a flash to hide.', 'Some can squeeze through a gap barely bigger than their beak.'], [
        q('Why did the author write this?', [0, 1, 2], 'to inform', ['to persuade', 'to entertain'], 'Is the author sharing facts, telling a story or trying to convince you?', 'Every sentence shares a fact about octopuses, so the purpose is to inform.'),
        q('How many hearts does an octopus have?', 0, 'three', ['one', 'two'], 'Find the sentence about hearts.', '“Octopuses have three hearts and blue blood.”'),
      ]),
      p('p3-dragon', ['The dragon sneezed, and the castle’s flags burst into flames.', '“Oops,” he mumbled, fanning them with his wings.', 'The princess just laughed and fetched a bucket.'], [
        q('Why did the author write this?', [0, 1, 2], 'to entertain', ['to inform', 'to persuade'], 'Is this real facts, or a made-up funny story?', 'A sneezing dragon who says “Oops” is a made-up, funny story, so the purpose is to entertain.'),
        q('What happened when the dragon sneezed?', 0, 'the flags caught fire', ['the castle fell down', 'it started to rain'], 'Find the sentence about the sneeze.', '“The dragon sneezed, and the castle’s flags burst into flames.”'),
      ]),
      p('p3-litter', ['Litter in parks harms birds and other animals.', 'Plastic can take hundreds of years to break down.', 'Please take your rubbish home or use the bins.'], [
        q('Why did the author write this?', [0, 2], 'to persuade', ['to entertain', 'to tell a joke'], 'Look for a sentence that asks the reader to do something.', '“Please take your rubbish home or use the bins.” The author wants you to act.'),
        q('Why does the author say litter is a problem?', 0, 'it harms animals', ['it looks colorful', 'it makes parks busy'], 'Find the reason given in the first sentence.', '“Litter in parks harms birds and other animals.”'),
      ]),
    ],
  ],
];

/** Make a round for this band and level, avoiding passages/stories played recently. */
export function makeRound(band: Band, level: number, recent: string[] = []): Round {
  const lvl = Math.max(0, Math.min(2, level));
  if (band === 0) {
    const pool = PICTURE_STORIES[lvl];
    const options = pool.filter((s) => !recent.includes(s.id));
    const story = (options.length ? options : pool)[Math.floor(Math.random() * (options.length || pool.length))];
    let order = shuffle([0, 1, 2]);
    while (order.every((v, i) => v === i)) order = shuffle([0, 1, 2]);
    return { kind: 'pictures', id: story.id, level: lvl, story, order, prefilled: lvl === 0 ? 1 : 0 };
  }
  const pool = PASSAGES[band][lvl];
  const options = pool.filter((x) => !recent.includes(x.id));
  const passage = (options.length ? options : pool)[Math.floor(Math.random() * (options.length || pool.length))];
  const question = passage.questions[Math.floor(Math.random() * passage.questions.length)];
  return { kind: 'text', id: passage.id, level: lvl, passage, question, choices: shuffle([question.answer, ...question.others]) };
}
