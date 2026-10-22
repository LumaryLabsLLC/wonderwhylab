import { useState } from 'react';
import { CalendarDays, Megaphone, Scale, UserSearch, Users } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, Emoji, EmojiRow, Lines, Note, Tap } from '../shared/kit';

type Verdict = 'trust' | 'check' | 'ad' | 'opinion';
type ClueId = 'who' | 'when' | 'ad' | 'others';

interface Post {
  emoji: string;
  text: string;
  clues: Record<ClueId, string>;
  verdict: Verdict;
  why: string;
}

const POSTS: Post[] = [
  {
    emoji: '🐙',
    text: 'Octopuses have three hearts.',
    clues: { who: 'A nature magazine’s website.', when: 'Posted this year.', ad: 'No: it isn’t selling anything.', others: 'Yes: encyclopedias say the same.' },
    verdict: 'trust',
    why: 'A known source, up to date, not selling anything, and other trusted sources agree.',
  },
  {
    emoji: '🥤',
    text: 'ZoomFizz makes you run faster! Buy yours today!',
    clues: { who: 'ZoomFizz, the drinks company.', when: 'This week.', ad: 'Yes: it says “Sponsored” and wants you to buy.', others: 'No: no science sites say this.' },
    verdict: 'ad',
    why: 'It is paid for by the company that sells the drink. Ads try to make you want to buy.',
  },
  {
    emoji: '🏫',
    text: 'SCHOOL CLOSED TOMORROW because of snow!!!',
    clues: { who: 'An account nobody knows.', when: 'Three years ago!', ad: 'No.', others: 'No: the school website says it is open.' },
    verdict: 'check',
    why: 'It is old and from an unknown account, and the school’s own website disagrees.',
  },
  {
    emoji: '🍕',
    text: 'Pizza is the best food in the world.',
    clues: { who: 'A food blogger.', when: 'Last month.', ad: 'No.', others: 'People disagree: lots of foods are loved.' },
    verdict: 'opinion',
    why: '“Best” is what someone thinks or feels. It can’t be proved true or false.',
  },
  {
    emoji: '🦈',
    text: 'Sharks are older than trees!',
    clues: { who: 'A science museum.', when: 'Posted last year.', ad: 'No.', others: 'Yes: scientists agree sharks appeared before the first trees.' },
    verdict: 'trust',
    why: 'An expert source, recent, not an ad, and other trusted sources agree.',
  },
  {
    emoji: '🎮',
    text: 'Star Racer: best game ever! Free this week only!',
    clues: { who: 'The company that makes Star Racer.', when: 'Today.', ad: 'Yes: it is marked “Ad”.', others: 'Reviews are mixed.' },
    verdict: 'ad',
    why: 'The game company paid for it, and “this week only” tries to hurry you.',
  },
];

const CLUES: { id: ClueId; icon: string; label: string }[] = [
  { id: 'who', icon: '🕵️', label: 'Who made it?' },
  { id: 'when', icon: '📅', label: 'When?' },
  { id: 'ad', icon: '📢', label: 'Is it an ad?' },
  { id: 'others', icon: '📚', label: 'Do others agree?' },
];

const VERDICTS: { id: Verdict; label: string }[] = [
  { id: 'trust', label: '✅ Looks trustworthy' },
  { id: 'check', label: '🔎 Check more' },
  { id: 'ad', label: '📢 It’s an ad' },
  { id: 'opinion', label: '💭 It’s an opinion' },
];

/** A nudge towards the right verdict that doesn't give it away. */
const NUDGE: Record<Verdict, string> = {
  trust: 'Look again: who made it, and do other trusted sources agree?',
  check: 'Look again at when it was posted and whether others agree.',
  ad: 'Look again at the “Is it an ad?” clue.',
  opinion: 'Could anyone prove this true or false?',
};

function SourcesScene() {
  const [feed] = useState(() => shuffle(POSTS).slice(0, 5));
  const [sel, setSel] = useState(0);
  const [seen, setSeen] = useState<Record<string, ClueId[]>>({});
  const [judged, setJudged] = useState<Record<string, Verdict>>({});
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' }>({
    text: 'Pick a post. Be a detective: check the clues before you decide.',
    tone: 'info',
  });
  const post = feed[sel];
  const clues = seen[post.text] ?? [];

  const clue = (id: ClueId) => {
    play('tap');
    if (!clues.includes(id)) setSeen({ ...seen, [post.text]: [...clues, id] });
  };

  const decide = (v: Verdict) => {
    if (clues.length < 2) {
      setNote({ text: 'Check at least two clues first. Good detectives look before they decide.', tone: 'nudge' });
      return;
    }
    if (v === post.verdict) {
      play('correct');
      setJudged({ ...judged, [post.text]: v });
      const done = Object.keys(judged).length + 1;
      setNote({ text: `Yes! ${post.why}${done === feed.length ? ' All posts checked: great detective work!' : ''}`, tone: 'good' });
    } else {
      play('wrong');
      setNote({ text: `Not quite yet. ${NUDGE[post.verdict]}`, tone: 'nudge' });
    }
  };

  return (
    <SceneSvg label="Check posts like a detective: who, when, ad, do others agree">
      <text x={40} y={30} fontSize={15} fill={C.muted} className="caps">
        Your feed
      </text>
      {feed.map((p, i) => {
        const y = 42 + i * 96;
        const v = judged[p.text];
        return (
          <Tap
            key={p.text}
            label={p.text}
            onTap={() => {
              play('tap');
              setSel(i);
              setNote({ text: judged[p.text] ? 'You checked this one already. Try another post.' : 'Check the clues, then decide.', tone: 'info' });
            }}
          >
            <Card x={40} y={y} w={400} h={86} fill={i === sel ? shade(C.yellow, 0.7) : C.card} stroke={i === sel ? C.orange : C.ink}>
              <Emoji e={p.emoji} x={80} y={y + 43} size={36} />
              <Lines text={p.text} x={116} y={p.text.length > 30 ? y + 36 : y + 49} max={30} size={16} lh={21} weight={600} />
              {v && (
                <text x={424} y={y + 24} textAnchor="end" fontSize={15} fontWeight={700} fill={C.green}>
                  ✓
                </text>
              )}
            </Card>
          </Tap>
        );
      })}

      {/* Detective panel */}
      <Card x={470} y={20} w={490} h={116} fill={shade(C.blue, 0.9)}>
        <Emoji e={post.emoji} x={516} y={78} size={44} />
        <Lines text={post.text} x={556} y={post.text.length > 34 ? 66 : 84} max={34} size={19} lh={24} weight={700} />
      </Card>
      {CLUES.map((c, i) => {
        const y = 150 + i * 70;
        const open = clues.includes(c.id);
        return (
          <g key={c.id}>
            <SvgButton x={470} y={y} w={200} h={58} fontSize={16} label={`${c.icon} ${c.label}`} active={open} onClick={() => clue(c.id)} />
            {open ? (
              <Lines text={post.clues[c.id]} x={686} y={post.clues[c.id].length > 30 ? y + 24 : y + 35} max={30} size={16} lh={20} />
            ) : (
              <text x={686} y={y + 35} fontSize={16} fill={C.muted}>
                Tap to find out
              </text>
            )}
          </g>
        );
      })}
      <text x={470} y={444} fontSize={15} fill={C.muted} className="caps">
        Your verdict
      </text>
      {VERDICTS.map((v, i) => (
        <SvgButton
          key={v.id}
          x={470 + (i % 2) * 248}
          y={454 + Math.floor(i / 2) * 64}
          w={240}
          h={56}
          fontSize={16}
          label={v.label}
          active={judged[post.text] === v.id}
          onClick={() => decide(v.id)}
        />
      ))}
      <Note x={40} y={526} w={400} text={note.text} tone={note.tone} />
      <SvgButton x={470} y={590} w={140} h={50} fontSize={15} label="Say it" onClick={() => speak(post.text, { force: true })} />
      <Callout at={[570, 150]} box={[700, 150]} w={250} icon={UserSearch} title="Ask questions" text="Who made it? When? Is it selling something? Do other trusted sources agree?" />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={10} y={10} width={64} height={60} rx={8} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <rect x={18} y={20} width={48} height={6} rx={3} fill={C.line} />
      <rect x={18} y={32} width={40} height={6} rx={3} fill={C.line} />
      <rect x={18} y={44} width={44} height={6} rx={3} fill={C.line} />
      <circle cx={84} cy={42} r={18} fill="none" stroke={C.ink} strokeWidth={5} />
      <line x1={97} y1={55} x2={112} y2={70} stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.5) {
      const c = pick([
        { s: 'Blue is the best colour.', a: 'Opinion' },
        { s: 'Water freezes at 0 °C.', a: 'Fact' },
        { s: 'Cats are cuter than dogs.', a: 'Opinion' },
        { s: 'A spider has eight legs.', a: 'Fact' },
        { s: 'Maths is the most fun subject.', a: 'Opinion' },
        { s: 'The Sun is a star.', a: 'Fact' },
      ]);
      return choiceQuestion({
        prompt: `“${c.s}” Is this a fact or an opinion?`,
        right: { value: c.a },
        wrong: [{ value: c.a === 'Fact' ? 'Opinion' : 'Fact' }],
        hint: 'Could you prove it true or false by checking?',
        explain: c.a === 'Fact' ? ['You can check it in a trusted book or website.', 'It is true for everyone, so it is a Fact.'] : ['It says what someone thinks or feels.', 'Other people may disagree, so it is an Opinion.'],
      });
    }
    const right = pick(['Win a FREE tablet! Click now!', 'Sponsored: Try new CrunchOs cereal!', 'Ad: Get 50% off Zoom trainers today!']);
    return choiceQuestion({
      prompt: 'Which post is an ad?',
      right: { value: right },
      wrong: shuffle(['Our class grew sunflowers this week.', 'The library opens at 9 on Saturdays.', 'Bees visit flowers to collect nectar.']).slice(0, 2).map((value) => ({ value })),
      hint: 'Look for words like “Sponsored”, “Ad”, “Buy” or “Free”.',
      explain: ['Ads try to get you to buy or click.', `“${right}” is selling something, so it is the ad.`],
    });
  }

  if (level === 1) {
    if (Math.random() < 0.5) {
      return choiceQuestion({
        prompt: 'Which question helps you check if a post is true?',
        right: { value: 'Do other trusted sources say the same?' },
        wrong: [{ value: 'Does it have lots of likes?' }, { value: 'Is it written in big bold letters?' }],
        hint: 'Likes and big letters show that something is popular or loud, not that it is true.',
        explain: ['Popular or loud doesn’t mean true.', 'Checking if other trusted sources agree helps.', 'So ask: do other trusted sources say the same?'],
      });
    }
    return choiceQuestion({
      prompt: 'A post says “No school today!” but it is from three years ago. What should you think?',
      right: { value: 'It’s old: check the school’s own website' },
      wrong: [{ value: 'Stay home, it must be true' }, { value: 'Share it with everyone quickly' }],
      hint: 'Does the date matter for news like this?',
      explain: ['News can be out of date.', 'This post is three years old.', 'So: it’s old: check the school’s own website.'],
    });
  }

  const kind = pick(['source', 'paid', 'fact'] as const);
  if (kind === 'source') {
    const c = pick([
      { q: 'how tall Mount Everest is', right: 'An encyclopedia or a geography website', wrong: ['A comment under a video', 'An advert for climbing boots'] },
      { q: 'how many moons Mars has', right: 'A space agency website', wrong: ['A post from an account you don’t know', 'A video game about aliens'] },
    ]);
    return choiceQuestion({
      prompt: `Where is the best place to check ${c.q}?`,
      right: { value: c.right },
      wrong: c.wrong.map((value) => ({ value })),
      hint: 'Who is an expert on this, and who might be trying to sell or entertain?',
      explain: ['Look for a source made by experts who check their facts.', `${c.right} is the most reliable choice.`],
    });
  }
  if (kind === 'paid') {
    return choiceQuestion({
      prompt: 'A video star says, “I love these trainers!” and the post has #ad on it. What does #ad mean?',
      right: { value: 'They were paid to show the trainers' },
      wrong: [{ value: 'The trainers are the best ones' }, { value: 'The video is about adding up' }],
      hint: 'Think about why a company might give a video star money.',
      explain: ['#ad means it is an advert.', 'So they were paid to show the trainers. They might still like them, but it isn’t a free opinion.'],
    });
  }
  const right = pick(['Octopuses have three hearts.', 'Honeybees make honey from nectar.', 'The Pacific is the largest ocean.']);
  return choiceQuestion({
    prompt: 'Which one is a fact, not an opinion?',
    right: { value: right },
    wrong: shuffle(['Octopuses are the coolest animals.', 'Honey tastes better than jam.', 'Everyone should love the beach.']).slice(0, 2).map((value) => ({ value })),
    hint: 'A fact can be checked and proved. An opinion is what someone thinks.',
    explain: ['Words like “coolest”, “better” and “should” show opinions.', `“${right}” can be checked in a trusted source, so it is the fact.`],
  });
}

export const checkingSources: Lesson = {
  id: 'checking-sources',
  title: 'Is It True?',
  Thumb,
  Scene: SourcesScene,
  sceneHint: 'Pick a post · Check the clues · Decide: trust it, check more, ad or opinion',
  learn: {
    heading: 'Be an information detective',
    intro: 'Not everything online is true, and some posts are trying to sell you something. Asking a few questions helps you decide what to trust.',
    points: [
      { icon: UserSearch, text: 'Who made it? Are they an expert, or do they want something?' },
      { icon: CalendarDays, text: 'When was it made? Old news may not be true any more.' },
      { icon: Megaphone, text: 'Is it an ad? Look for “Sponsored”, “Ad” or “#ad”.' },
      { icon: Users, text: 'Do other trusted sources agree?' },
      { icon: Scale, text: 'Fact or opinion? Facts can be checked; opinions are what people think.' },
    ],
  },
  steps: ['Read the post carefully.', 'Ask: who made it, and when?', 'Ask: is it trying to sell me something?', 'Check if other trusted sources agree before you believe or share it.'],
  example: {
    question: '“SCHOOL CLOSED TOMORROW!!!” from an account nobody knows, posted three years ago. Trust it?',
    visual: <EmojiRow items={['🏫', '📅', '❓']} label="A school post with an old date" />,
    work: ['Who? An unknown account.', 'When? Three years ago, so it is old.', 'Others? The school website says it is open.'],
    answer: 'Don’t trust it yet. Check the school’s own website.',
  },
  grownups: [
    'When you read news together, ask “How do we know?” and look at who published it.',
    'Point out adverts and sponsored posts on screens and in magazines. Ask what they want you to do.',
    'Celebrate changing your mind when new evidence turns up: that is good thinking.',
  ],
  makeQuestion,
};
