# Wonder Why Lab

Playful, hands-on math, reading and writing, science, coding, geography and life skills for children aged 4 to 12, plus stories and games. Live at https://wonderwhylab.com.

The app opens on a simple Home screen with eight big tiles: Math, Reading & Writing, Science, Stories, Coding, World, Life Skills and Games. Each subject shows a lesson path for the child's age. Every lesson pairs a hands-on playground with one side panel (Practice, Learn and Example).

**Everything adapts to age.** The age a child picks sets which lessons, stories and games appear, how hard the games are, and the whole look:
- **4–5:** sunny colours, big chunky buttons and larger text.
- **6–7:** fresh greens.
- **8–9:** ocean blues.
- **10–12:** a calmer indigo design with thinner lines and plain answer buttons.

The themes live under `.app[data-age]` in `src/styles/app.css`.

## Lessons

194 lessons in total. Every subject has lessons for each of the four age groups.

| Ages | Math (56) | Reading & Writing (40) | Science (50) |
| --- | --- | --- | --- |
| 4–5 | counting, numbers to 20, more or less, shapes, patterns, adding, taking away, longer or shorter, sorting, position words, heavy and full, estimating, symmetry | rhymes, clapping syllables, first sounds, letters and sounds, blending, sound boxes, writing letters, spelling by sounds, labelling pictures, capital and small letters | five senses, sink or float, push and pull, magnets, hot and cold, light and shadows, what plants need, living or not, weather, tall towers, recycling, day and night sky |
| 6–7 | make 10, add and subtract to 20, tens and ones, skip counting, time, odd and even, 3D shapes, halves and quarters, story problems, numbers to 100, grams, kilos and litres, shape properties, doubles and halves | short vowels, blends, digraphs, magic e, heart words, reading a sentence, spelling by sounds, capitals and full stops, writing a sentence, naming and doing words | solids, liquids and gases, ramps, sound, life cycles, day and night, the water cycle, seasons, food and health, rocks and soil, bridges, testing materials, changes we can undo |
| 8–9 | times tables, sharing, fractions, place value to 1000, rounding, measuring, bar graphs, area model, equivalent fractions, elapsed time, factors and multiples, column multiplication, short division, triangles and quadrilaterals, volume | vowel teams, prefixes and suffixes, compound words, new words, story order, main idea, spelling rules, punctuation, paragraphs, adjectives and adverbs | circuits, forces, simple machines, mixing and dissolving, food chains, bones and muscles, mirrors, the solar system, Moon phases, earthquakes and volcanoes, erosion, keeping things cold, designing a boat |
| 10–12 | decimals, percentages, area and perimeter, angles, negative numbers, coordinates, equations, ratios, averages, probability, primes, multiplying and dividing fractions, order of operations, expressions, nets and surface area | Greek and Latin roots, context clues, figurative language, inference, text structure, fact or opinion, opinion writing, story writing, clauses and tenses, editing | atoms and molecules, density, acids and bases, energy, gravity and weight, cells, electromagnets, waves, heredity, chemical or physical change, conservation of mass, energy sources, climate and weather |

| Ages | Coding (16) | World (16) | Life Skills (16) |
| --- | --- | --- | --- |
| 4–5 | move the robot, plan a path, fix the bug, repeat it | bird's-eye view, land and water, around town, homes around the world | naming feelings, balloon breathing, needs and wants, handwashing |
| 6–7 | sequences, repeat loops, debugging, everyday algorithms | compass directions, map keys, continents and oceans, landforms | counting coins, saving up, solving problems with friends, sleep, movement and water |
| 8–9 | if-then, events, making your own block, keeping score | grid maps, climate zones, a river's journey, natural resources | making change, spend, save and share, handling big feelings, staying safe online |
| 10–12 | binary, if-else and logic, functions with inputs, sorting algorithms | latitude and longitude, time zones, map scale, cities and populations | budgets and interest, best buys, is it true?, digital citizenship |

## Stories

24 original stories, six for each age group, each followed by a few questions. Every word can be tapped to hear it. The stories for ages 4–7 are decodable: they use only the sounds taught in the reading lessons for that age, plus a few heart words. The stories for ages 8–12 are longer, with words to know and questions about recall, sequence, inference, vocabulary and theme.

## Games

There are 26 games, and each one adjusts to the four age groups:
- **Math (9):** Quick Look, Bubble Pop, Rocket Race, Memory Match, Feed the Monster, Number Line Jump, Sorting Party, Shape Builder, Fraction Café.
- **Reading (9):** Sound It Out, ABC Train, Letter Fishing, First Sounds, Word Builder, Read and Match, Rhyme Time, Sentence Builder, Story Detective.
- **Science (8):**
  - Physics: Balance Lab, Launch Lab, Circuit Builder.
  - Chemistry: Potion Lab, Molecule Builder.
  - Biology: Habitat Rescue, Body Builder, Garden Lab.

## Features

- **Interactive scenes** drawn in SVG. You can drag to pan, scroll or pinch to zoom, use WASD keys, and turn the labels on or off.
- **Clear directions** on every lesson's Practice screen explain how to use the playground and answer its questions. Games show directions for the child's age, with a **How to play** reminder and a restart button during play. Speaker buttons read the directions and current game goals on request.
- **One calm side panel** per lesson, with three tabs: Practice, Learn (with tips for grown-ups) and Example. A small switcher at the top moves between lessons.
- **Built on learning science** (see [docs/LEARNING-SCIENCE.md](docs/LEARNING-SCIENCE.md)):
  - **Spaced, mixed Review:** finished lessons come back after 1, 3, 7, 14 and 30 days.
  - **Mastery levels:** each lesson shows learning → practising → mastered.
  - **Adaptive difficulty:** aims for about 80% right first time.
  - **Hints and worked solutions:** a hint after one slip, then step-by-step help using the question's own numbers.
  - **Praise for effort and strategy.**
  - **Relaxed, timer-free games.**
  - **Brain-break nudges.**
- **Stickers** for milestones.
- **Quiet by default.** Nothing talks or beeps on its own. A speaker button reads a question, a lesson or a word whenever a child taps it. Grown-ups can turn on automatic read-aloud and sound effects in Settings. On phones and tablets the voice is the device's own, which speaks the moment the speaker is tapped. On computers it is the Kokoro neural model, running in the browser: it downloads once (about 110 MB) the first time something is read aloud, and the built-in voice answers until it is ready, or if it can't load. The neural voices can also be chosen on a phone in Settings.
- **No accounts and no server.** Progress is saved in the browser with `localStorage`.
- **Works on any screen.** Desktop uses a floating-panel layout. Tablets and phones get a scrolling layout. On phones, each playground runs edge to edge and zooms to fit what it draws, and it keeps anything that appears later in view. Full screen fills the phone and, when the phone is upright, turns the playground sideways so it can be drawn bigger.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # question data, all lesson/game interactions, guides and voice regressions (one worker)
npm run catalog    # regenerate the lesson and game catalogs after adding or renaming one
npm run build      # type-check and build to dist/
```

The interaction tests open all 194 lesson playgrounds, exercise scene buttons, switch guide tabs, and complete five practice questions per lesson. They also finish all 26 games at each of the four age bands. Voice tests cover manual and automatic reading, mathematical wording, generated-audio playback order, cancellation, and fallback when the natural voice is blocked, stalls, or cannot play.

These tests use jsdom with simulated layout and audio APIs. A release still needs a real-device check of touch dragging, responsive layout, and audible speech in desktop and phone browsers. The test runner uses one worker to keep CPU use down; focused checks such as `npx vitest run src/lib/natural-voice.test.ts` are useful while editing.

## Deploying

The site must be sent with two headers so the voice model can use several CPU threads. Without them speech still works, but each sentence takes about twice as long to start:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`vercel.json` and `public/_headers` (for Netlify and Cloudflare Pages) already set them, and `npm run dev` and `npm run preview` do too.

## Project layout

```
src/
  App.tsx              screen layout and lesson state
  components/          sidebar, status bar, info panel, Try-it engine, rail, modals
  stage/               pan/zoom stage, callouts, in-scene buttons
  visuals/             shared drawings: objects, ten-frames, number lines, isometric boxes
  lessons/
    types.ts           the Lesson / Question contract
    index.ts           loads each age group's lessons when first opened
    catalog.ts         lesson names and order for the menus (generated: npm run catalog)
    all.ts             every lesson at once, for tests
    tiny/ builders/ explorers/ masters/   math, one file per lesson + index.ts per age group
    reading/ science/ coding/ world/ life/  the other subjects, one folder per age group
  stories/             decodable stories (early/) and longer stories (later/)
  games/               one folder per game, the Game contract in types.ts, and a generated catalog.ts
  lib/                 progress store, sound, speech (natural voice in a web worker), random helpers
```

## Adding a lesson

1. Create a file in the right age folder that exports a `Lesson` (see `src/lessons/types.ts`, and use `src/lessons/tiny/count-to-10.tsx` as a model):
   - `Scene`: an interactive SVG inside `<SceneSvg>` (a 1000 × 680 world), with `<Callout>` labels and `<SvgButton>` controls.
   - `learn`, `steps`, `example`, `grownups`: the four guide tabs.
   - `makeQuestion(level)`: returns a question for level 0, 1 or 2. Use `choices` for multiple choice, or leave them out to show a number pad.
2. Add it to the age group's `index.ts`.
3. Run `npm run catalog` so the menus list it. The app loads each age group's lessons only when they are opened, so the names and order the menus show live in a small generated catalog.
4. Run `npm test`. It generates hundreds of questions per level and checks that every one has exactly one correct choice, and that the catalog is up to date.

## Social preview image

`public/og-image.jpg` is the picture X, iMessage, Slack and others show when someone shares the link. Its source is `docs/social/card.html`, which uses two app screenshots in the same folder. To change it, edit the HTML, open it in Chrome at 1200 × 630, take a 2× screenshot, and save it as `public/og-image.jpg`.
