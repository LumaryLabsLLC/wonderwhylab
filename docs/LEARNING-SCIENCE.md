# Learning science behind Wonder Why Lab

This page lists the research the app's design leans on. For each finding, it says what the app does about it and how strong the evidence is. Where the research is contested, we say so, and the app takes the gentler option.

## At a glance

| Practice | Evidence | Where it lives in the app |
| --- | --- | --- |
| Practice testing (retrieval) | Strong | Every lesson ends in practice questions; Review asks again later |
| Spaced (distributed) practice | Strong | Review schedule: 1 → 3 → 7 → 14 → 30 days (`src/lib/memory.ts`) |
| Interleaved practice | Moderate (large effects in maths) | Review mixes lessons; the same lesson never comes twice in a row |
| Elaborated feedback and worked examples | Strong for feedback overall; good for novices | A hint after one slip, then a worked solution using the question's own numbers |
| Concrete → pictorial → abstract | Recommended by IES and EEF | Each lesson pairs a hands-on playground with pictures and number sentences |
| Desirable difficulty (~80–85% success) | Suggestive (models and animals) | Adaptive "3 up, 1 down" difficulty, remembered per lesson |
| Process praise ("you kept trying") | Mixed but leaning positive | Praise names effort and strategy; mistakes are "not yet" |
| Low-pressure practice | Contested | Relaxed games with no timers (the default) |
| Phonics: blending sounds | Strong for early reading | Sound It Out (blend phonemes into words) |
| Linear number-line games | Good (RCTs) | Number Line Jump and the number-line lessons |
| Quick-image subitizing | Recommended (learning trajectories) | Quick Look |
| Fewer "seductive details" | Good for low prior knowledge | Calm screens, labels off by default, no decoration in games |
| Rewards tied to real progress | Mixed; tie rewards to performance | Stars for accuracy; stickers for mastery, reviews and persistence |
| Movement breaks | Supportive | Brain-break nudge every 15 minutes (can be turned off) |
| Talking with a grown-up | Recommended (social pillar) | "Tell a grown-up how you solved one" and tips for grown-ups |
| Reading: both halves of the Reading Rope | Strong (consensus models) | Reading lessons cover sounds, phonics, heart words, vocabulary, sentences and comprehension |
| Predict → observe → explain (science) | Promising (small studies) | Science experiments ask for a prediction first, then explain the result |
| Game design: scaffolding and repeated play | Moderate (meta-analysis) | Games nudge after a mistake, show how after two, and adapt within a session |

## Details

### Retrieval, spacing and interleaving
Dunlosky et al. (2013) rated **practice testing** and **distributed practice** as the two highest-utility learning techniques. Both work across ages, abilities and kinds of material. They rated interleaving "moderate", but in maths the effect is large. In Rohrer et al. (2010), interleaving lowered scores during practice yet doubled scores on a test a day later. A 2020 classroom trial found a large boost on a delayed test (d = 0.83).

**In the app:** finishing a lesson schedules a review for the next day. Each review that is right first time moves the lesson to a longer gap; any slip brings it back sooner. A lesson counts as **mastered** once it has survived reviews up to a 7-day gap. Review sessions mix 2 questions from each due lesson and never repeat a lesson back to back.

### Feedback that explains
Hattie and Timperley (2007) found feedback among the strongest influences on learning, but its effect varies a lot with the type. Feedback that helps learners spot and fix wrong ideas works best. A 2020 re-analysis of 435 studies found a medium effect (d = 0.48), stronger for feedback that carries more information. Worked examples, faded toward independent work, suit novices (Renkl and colleagues).

**In the app:**
1. A first wrong try gives a strategy hint that doesn't give the answer away.
2. A second wrong try gives a 2–4 step worked solution built from that question's own numbers. It uses the same strategy the lesson's playground teaches, such as making a ten, hopping on a number line or reading a ruler.
3. The child then taps the answer themselves, and a fresh question follows so they can try one on their own.

A test checks that every question in every lesson has a hint and a worked solution that reaches the answer (`src/lessons/lessons.test.ts`).

### Concrete → pictorial → abstract
The IES early-math practice guide recommends teaching number and operations along a developmental progression. The EEF guidance recommends manipulatives and representations, with explicit links between concrete, pictorial and abstract forms. Manipulatives are a scaffold to be removed later.

**In the app:** each lesson's playground is the concrete stage (counters, base-ten blocks, clocks, balances), questions show the pictorial stage, and number sentences are the abstract stage. The worked solutions refer back to the same pictures.

### Difficulty
Wilson et al. (2019) showed that learning is fastest at about 85% accuracy, for models and in animal data. For children this is a guide, not a proven rule.

**In the app:** three first-try answers in a row step the difficulty up, and any slip steps it down. That settles around 80% first-try success. The level is saved per lesson, so the next visit starts at the right challenge.

### Praise, mistakes and motivation
Mueller and Dweck (1998) found that praising intelligence led to worse responses after failure than praising effort. Recent replications are mixed, with process praise helping persistence in some studies. Research on rewards and intrinsic motivation is also debated (Deci, Koestner and Ryan, 1999, versus Cameron and Pierce). The safest reading is to tie rewards to real performance.

**In the app:** praise names the work ("Nice thinking!", "You kept trying and got it!"), mistakes are "not yet", and the end card celebrates fixed mistakes. Stars reflect accuracy. Stickers reward mastery, finished reviews and persistence ("Never give up").

### Time pressure
Boaler argues that timed tests can trigger maths anxiety. Others point out there are few rigorous experiments, and a 2021 U.S. Department of Education guide recommends some timed activities for fluency.

**In the app:** games are **relaxed by default** (no countdown) and timers are an option in Settings.

### Reading
The IES guide for foundational reading (K–3) recommends:
- teaching children to hear the sounds in words and link them to letters
- teaching decoding
- daily reading of connected text

Systematic phonics outperformed other approaches in Ehri et al. (2001).

Two widely used models show what skilled reading needs. The Simple View of Reading (Gough and Tunmer, 1986) says comprehension is *word recognition × language comprehension*: if either is zero, so is understanding. Scarborough's Reading Rope (2001) splits these into strands. Word recognition covers phonological awareness, decoding and sight recognition. Language comprehension covers background knowledge, vocabulary, language structures, verbal reasoning and literacy knowledge. Explicit vocabulary teaching of useful "Tier 2" words (Beck and colleagues) supports later comprehension.

**In the app:** reading has its own lessons, one module per age group, covering both halves of the rope.
- **Ages 4–5:** rhymes, syllables, first sounds, letters and sounds, oral blending, sound boxes.
- **Ages 6–7:** short vowels, blends, digraphs, magic e, heart words (common words mapped sound by sound with the tricky part marked), decodable sentences.
- **Ages 8–9:** vowel teams, prefixes and suffixes, compound words, Tier 2 vocabulary, story order, main idea.
- **Ages 10–12:** Greek and Latin roots, context clues, figurative language, inference with evidence, text structure, fact and opinion.

Sounds are taught as sounds, and children decode words rather than guessing from pictures. The games add practice:
- **Sound It Out:** blending.
- **First Sounds, Word Builder, Read and Match, Rhyme Time:** letter sounds, spelling and word reading.
- **Sentence Builder:** sentence structure.
- **Story Detective:** comprehension with evidence.

### Number sense games
Playing a simple **linear** number board game improved preschoolers' number-line estimation, counting and number knowledge (Siegler and Ramani). Circular boards did not. Clements and Sarama recommend **quick images** and conceptual subitizing (seeing "5 and 2" at a glance) right through elementary school.

**In the app:** Number Line Jump and the number-line lessons, and Quick Look (flash, then rebuild what you saw).

### Science: predict, observe, explain
Children arrive with their own ideas about how the world works, and many are misconceptions (for example, "heavy things sink"). In *predict → observe → explain*, the child commits to a prediction, runs the experiment, then explains any mismatch. This makes their existing idea visible, so the result can challenge it. Studies, mostly small classroom ones, consistently report fewer misconceptions afterwards, for example about light, heat and floating. The evidence is promising rather than conclusive.

**In the app:** science experiments use a shared Predict card before the key moment and an Explain card after it, which says what happened and why in one true sentence (`src/stage/Predict.tsx`). Lessons that aren't experiments, such as labelling a cell, skip it.

### Games that teach
A meta-analysis of digital learning games (Clark, Tanner-Smith and Killingsworth, 2016) found an average gain of about 0.3 standard deviations over ordinary instruction. Effects were larger with repeated play across sessions (about 0.44) and with extra built-in scaffolding (about 0.41). A single session made little difference.

**In the app:** every game is hands-on (drag, build, steer, catch) and tied to a learning goal. Newer games nudge after a mistake, show how after a second one, and adjust difficulty within the session. Best scores encourage coming back, since repeated play is where the gains are.

### Calm screens
Interesting but irrelevant extras ("seductive details") can hurt learning, especially for learners with less prior knowledge or working memory, which describes young children.

**In the app:** scenes start without labels, decorations are minimal, nothing plays sound on its own, and each game shows one goal at a time.

### Breaks and grown-ups
A classroom study of short activity breaks (Mahar et al., 2006) found about 8% more on-task behaviour, and about 20% for the least focused children. Hirsh-Pasek et al. (2015) describe educational apps as working best when they are active, engaged, meaningful and **socially interactive**.

**In the app:**
- a brain-break suggestion after 15 minutes of use
- a prompt to explain an answer to a grown-up
- tips for grown-ups in every lesson
- each subject page shows every lesson's mastery stage, what's due for review, and a "Start here" suggestion

## Limits and next steps

What this app hasn't had yet:
- **Expert review:** a teacher or curriculum specialist hasn't checked the content.
- **Testing with children:** it hasn't been tried with real children.
- **Original papers:** some of the research here comes from summaries rather than the papers themselves.

Those are the most valuable next steps for checking that it really works for kids.

## Sources

- Dunlosky et al. (2013), *Improving students' learning with effective learning techniques*. https://es.aft.org/sites/default/files/dunlosky_0.pdf
- Rohrer et al., interleaved mathematics practice. https://ies.ed.gov/use-work/awards/efficacy-study-interleaved-mathematics-practice
- Hattie and Timperley (2007), *The power of feedback*. https://www.uky.edu/~gmswan3/575/Hattie_Timperly_2007.pdf
- Wisniewski, Zierer and Hattie (2020), *The power of feedback revisited*. https://www.frontiersin.org/articles/10.3389/fpsyg.2019.03087/full
- IES/WWC, *Teaching Math to Young Children*. https://ies.ed.gov/ncee/rel/math-young-children
- EEF, *Improving Mathematics in the Early Years and Key Stage 1*. https://dera.ioe.ac.uk//35027/1/EEF_Maths_EY_KS1_Guidance_Report.pdf
- IES/WWC, *Foundational Skills to Support Reading for Understanding in K–3*. https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/wwc_foundationalreading_070516.epub
- Buckingham, *Evidence strongly favours systematic synthetic phonics* (summary of Ehri et al., 2001). https://fivefromfive.com.au/wp-content/uploads/2023/01/Buckingham-Evidence-strongly-favours-systematic-synthetic-phonics.pdf
- Siegler and Ramani, linear number board games. https://www.cmu.edu/dietrich/psychology/cs/research-teaching/docs/SieglerBoardGamesCDPerp2009.pdf
- Subitizing and quick images (Clements and Sarama). https://hechingerreport.org/proof-points-subitizing/
- Wilson et al. (2019), *The Eighty Five Percent Rule for optimal learning*. https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579
- Process versus person praise. https://par.nsf.gov/biblio/10572660
- Timed tests and maths anxiety (both sides). https://ed.stanford.edu/news/boaler-timed-tests-and-development-math-anxiety and https://hechingerreport.org/proof-points-do-math-drills-help-children-learn/
- Rewards and intrinsic motivation. https://journals.sagepub.com/doi/10.3102/00346543071001001
- Seductive details. https://www.aft.org/ae/fall2020/sundar
- Mahar et al. (2006), classroom activity breaks. https://strathprints.strath.ac.uk/37070/
- Hirsh-Pasek et al. (2015), *Putting education in "educational" apps*. https://www.psychologicalscience.org/publications/educational-apps.html
- Scarborough's Reading Rope (Arizona Department of Education). https://www.azed.gov/scienceofreading/scarbreadingrope
- Models of reading: the Simple View and the Reading Rope (Reading Rockets). https://www.readingrockets.org/reading-101/how-children-learn-read/models-reading
- Explicit vocabulary instruction (National Center on Improving Literacy). https://improvingliteracy.org/resource/explicit-vocabulary-instruction-to-build-fair-access-for-all-learners/
- Predict–observe–explain and misconceptions in elementary science. https://journalfkipunipa.org/index.php/kpej/article/view/1102
- Clark, Tanner-Smith and Killingsworth (2016), *Digital games, design, and learning*. https://doi.org/10.3102/0034654315582065
