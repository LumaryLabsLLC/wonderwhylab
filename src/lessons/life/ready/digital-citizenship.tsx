import { useState } from 'react';
import { Footprints, KeyRound, MessageSquareHeart, Scale, ShieldCheck } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Card, DragItem, Emoji, EmojiLabel, EmojiRow, inside, Lines, Note, Tap } from '../shared/kit';
import type { Box } from '../shared/kit';

type Tab = 'privacy' | 'pass' | 'footprint' | 'balance';
type SetNote = (n: { text: string; tone: 'good' | 'nudge' | 'info' }) => void;

/* ---------- Privacy settings ---------- */

const SETTINGS = [
  { label: 'Who can see my profile', safe: 'Friends only', risky: 'Everyone', why: 'Friends only means strangers can’t see your posts.' },
  { label: 'Share my location', safe: 'Off', risky: 'On', why: 'Location off keeps where you are private.' },
  { label: 'Who can message me', safe: 'Friends only', risky: 'Anyone', why: 'Only people you know can message you now.' },
  { label: 'Show my full real name', safe: 'Off', risky: 'On', why: 'A nickname is safer than your full name.' },
  { label: 'Others can tag me in photos', safe: 'Ask me first', risky: 'Always', why: 'Now you choose which photos have your name on them.' },
];

function PrivacyTab({ setNote }: { setNote: SetNote }) {
  const [safe, setSafe] = useState<boolean[]>(SETTINGS.map(() => false));
  const score = safe.filter(Boolean).length;
  const flip = (i: number) => {
    const next = safe.map((v, j) => (j === i ? !v : v));
    setSafe(next);
    const n = next.filter(Boolean).length;
    if (n === SETTINGS.length) {
      play('complete');
      setNote({ text: 'Every setting is on its safest choice. Check your settings again whenever an app updates.', tone: 'good' });
    } else if (next[i]) {
      play('pop');
      setNote({ text: SETTINGS[i].why, tone: 'good' });
    } else setNote({ text: `“${SETTINGS[i].risky}” shares more than you might want. Which is safer?`, tone: 'nudge' });
  };
  return (
    <g>
      <text x={40} y={118} fontSize={15} fill={C.muted} className="caps">
        A pretend app’s privacy settings · tap to change
      </text>
      {SETTINGS.map((s, i) => {
        const y = 132 + i * 76;
        const on = safe[i];
        return (
          <Tap key={s.label} label={`${s.label}: ${on ? s.safe : s.risky}`} onTap={() => flip(i)}>
            <rect x={40} y={y} width={620} height={66} rx={14} fill={C.card} stroke={C.line} strokeWidth={1.5} />
            <text x={60} y={y + 40} fontSize={18} fontWeight={600} fill={C.ink}>
              {s.label}
            </text>
            <rect x={450} y={y + 9} width={196} height={48} rx={24} fill={on ? shade(C.green, 0.6) : shade(C.orange, 0.6)} stroke={C.ink} strokeWidth={2} />
            <circle cx={on ? 622 : 474} cy={y + 33} r={18} fill={C.card} stroke={C.ink} strokeWidth={2} />
            <text x={on ? 528 : 572} y={y + 39} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
              {on ? s.safe : s.risky}
            </text>
          </Tap>
        );
      })}
      <Card x={690} y={132} w={270} h={370}>
        <text x={825} y={170} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
          Privacy shield
        </text>
        <Emoji e="🛡️" x={825} y={250} size={84} />
        {SETTINGS.map((_, i) => (
          <rect key={i} x={716 + i * 46} y={320} width={38} height={40} rx={8} fill={i < score ? C.green : C.paper} stroke={C.ink} strokeWidth={1.5} />
        ))}
        <text x={825} y={400} textAnchor="middle" fontSize={22} fontWeight={800} fill={score === SETTINGS.length ? C.green : C.ink}>
          {score} of {SETTINGS.length} safe
        </text>
        <Lines text="Settings decide who sees what you share." x={825} y={440} max={24} size={15} lh={20} anchor="middle" fill={C.ink2} />
      </Card>
    </g>
  );
}

/* ---------- Passphrase builder ---------- */

const WORDS = ['otter', 'rocket', 'pancake', 'jungle', 'violet', 'thunder', 'pebble', 'comet', 'waffle', 'castle', 'meadow', 'tiger', 'banjo', 'lantern', 'cactus', 'harbour'];
const TRAPS = [
  { word: 'YourName', why: 'Your name is easy for people who know you to guess.' },
  { word: 'BirthYear', why: 'A birth year is easy to find out.' },
  { word: 'password', why: '“password” is one of the most guessed passwords in the world.' },
  { word: '123456', why: '“123456” is guessed in seconds.' },
];
const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

function strength(tiles: string[]) {
  const trap = TRAPS.find((t) => tiles.includes(t.word));
  if (trap) return { level: 0, label: 'Weak', why: trap.why };
  const n = tiles.length;
  if (n === 0) return { level: 0, label: '–', why: 'Tap word tiles to build a practice passphrase.' };
  if (n === 1) return { level: 1, label: 'Weak', why: 'One word is quick to guess. Add more random words.' };
  if (n === 2) return { level: 2, label: 'Getting there', why: 'Two words is better. A third random word makes it much harder to guess.' };
  if (n === 3) return { level: 3, label: 'Strong', why: 'Three random words: long, easy for you to remember, hard to guess.' };
  return { level: 4, label: 'Very strong', why: 'Lots of random words make a very long passphrase.' };
}

function PassTab({ setNote }: { setNote: SetNote }) {
  const [pool, setPool] = useState(() => shuffle(WORDS).slice(0, 8));
  const [tiles, setTiles] = useState<string[]>([]);
  const st = strength(tiles);
  const allTiles = [...pool, ...TRAPS.map((t) => t.word)];
  const add = (w: string) => {
    if (tiles.length >= 5 || tiles.includes(w)) return;
    const next = [...tiles, w];
    setTiles(next);
    const s = strength(next);
    play(s.level >= 3 ? 'correct' : 'pop');
    setNote({ text: s.why, tone: s.level >= 3 ? 'good' : TRAPS.some((t) => t.word === w) ? 'nudge' : 'info' });
  };
  const colours = [C.red, C.orange, C.yellow, C.green, C.teal];
  return (
    <g>
      <text x={40} y={118} fontSize={15} fill={C.muted} className="caps">
        Practice only · never use a real password here
      </text>
      {allTiles.map((w, i) => {
        const x = 40 + (i % 4) * 158;
        const y = 132 + Math.floor(i / 4) * 66;
        const trap = TRAPS.some((t) => t.word === w);
        const used = tiles.includes(w);
        return (
          <SvgButton
            key={w}
            x={x}
            y={y}
            w={148}
            h={56}
            fontSize={17}
            label={trap ? w : cap(w)}
            color={trap ? shade(C.purple, 0.85) : C.card}
            disabled={used}
            onClick={() => add(w)}
          />
        );
      })}
      <Card x={40} y={340} w={620} h={92} fill={shade(C.blue, 0.88)}>
        <text x={60} y={368} fontSize={15} fill={C.ink2}>
          Your practice passphrase
        </text>
        <text x={60} y={410} fontSize={tiles.join('').length > 30 ? 20 : 26} fontWeight={800} fill={C.ink}>
          {tiles.length ? tiles.map((t) => (TRAPS.some((x) => x.word === t) ? t : cap(t))).join('') : '…'}
        </text>
      </Card>
      <SvgButton x={40} y={444} w={140} h={50} fontSize={16} label="Clear" onClick={() => setTiles([])} />
      <SvgButton
        x={194}
        y={444}
        w={160}
        h={50}
        fontSize={16}
        label="New words"
        onClick={() => {
          setPool(shuffle(WORDS).slice(0, 8));
          setTiles([]);
        }}
      />
      <Card x={690} y={132} w={270} h={362}>
        <text x={825} y={168} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
          How strong?
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={716} y={340 - i * 40} width={218} height={32} rx={8} fill={i <= st.level && tiles.length ? colours[i] : C.paper} stroke={C.ink} strokeWidth={1.5} />
        ))}
        <text x={825} y={410} textAnchor="middle" fontSize={22} fontWeight={800} fill={C.ink}>
          {st.label}
        </text>
        <Lines text="Keep real passwords secret, except from your grown-up." x={825} y={444} max={26} size={15} lh={20} anchor="middle" fill={C.ink2} />
      </Card>
    </g>
  );
}

/* ---------- Digital footprint ---------- */

const POSTS = [
  { emoji: '🔬', text: 'A photo of your science project', ok: true, why: 'Something you’re proud of is a great footprint.' },
  { emoji: '😝', text: 'A mean joke about a classmate', ok: false, why: 'It could hurt them, and it stays online even if you delete it later.' },
  { emoji: '🏖️', text: 'Holiday photos while you’re still away', ok: false, why: 'It tells people your home is empty. Post them when you’re back.' },
  { emoji: '📖', text: 'A review of a book you loved', ok: true, why: 'Kind, helpful posts build a footprint you’ll be glad of.' },
  { emoji: '💬', text: 'A screenshot of a friend’s private chat', ok: false, why: 'Private messages belong to your friend. Ask before sharing anything of theirs.' },
  { emoji: '🏆', text: 'Well done to our team for winning!', ok: true, why: 'Cheering others on is a positive footprint.' },
];
const FINE: Box = { x: 40, y: 100, w: 300, h: 420 };
const THINK: Box = { x: 660, y: 100, w: 300, h: 420 };

function FootprintTab({ setNote }: { setNote: SetNote }) {
  const [order] = useState(() => shuffle(POSTS));
  const [done, setDone] = useState<typeof POSTS>([]);
  const [drag, setDrag] = useState<Pt | null>(null);
  const card = order[done.length];
  const place = (ok: boolean) => {
    if (!card) return;
    if (card.ok !== ok) {
      play('wrong');
      setNote({ text: `Not yet. ${card.ok ? 'Is there anything unkind or private in this one?' : 'Could this hurt someone or share something private?'}`, tone: 'nudge' });
      return;
    }
    play('pop');
    const next = [...done, card];
    setDone(next);
    setNote({ text: next.length === POSTS.length ? 'All sorted! Before you post, ask: is it kind, is it mine to share, and would I be happy for anyone to see it in 10 years?' : card.why, tone: 'good' });
  };
  const bin = (b: Box, ok: boolean) => {
    const items = done.filter((d) => d.ok === ok);
    return (
      <Card x={b.x} y={b.y} w={b.w} h={b.h} fill={shade(ok ? C.green : C.orange, 0.85)}>
        <Emoji e={ok ? '👣' : '🤔'} x={b.x + 34} y={b.y + 34} size={30} />
        <text x={b.x + 62} y={b.y + 42} fontSize={20} fontWeight={800} fill={C.ink}>
          {ok ? 'Fine to post' : 'Think twice'}
        </text>
        {items.map((d, i) => (
          <g key={d.text}>
            <rect x={b.x + 14} y={b.y + 66 + i * 112} width={b.w - 28} height={100} rx={12} fill={C.card} stroke={C.line} strokeWidth={1.5} />
            <Emoji e={d.emoji} x={b.x + 46} y={b.y + 116 + i * 112} size={30} />
            <Lines text={d.text} x={b.x + 76} y={b.y + 104 + i * 112} max={20} size={16} lh={20} />
          </g>
        ))}
      </Card>
    );
  };
  return (
    <g>
      {bin(FINE, true)}
      {bin(THINK, false)}
      {card ? (
        <>
          <text x={500} y={128} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
            {`Post ${done.length + 1} of ${POSTS.length} · drag it`}
          </text>
          <DragItem
            key={card.text}
            at={{ x: 500, y: 254 }}
            r={100}
            label={card.text}
            dragging={!!drag}
            onMove={setDrag}
            onDrop={(p) => {
              setDrag(null);
              if (inside(p, FINE)) place(true);
              else if (inside(p, THINK)) place(false);
            }}
          >
            <PostCard post={card} />
          </DragItem>
          <SvgButton x={380} y={376} w={114} h={56} fontSize={15} label="◀ Post it" title="Fine to post" onClick={() => place(true)} />
          <SvgButton x={506} y={376} w={114} h={56} fontSize={15} label="Think ▶" title="Think twice" onClick={() => place(false)} />
        </>
      ) : (
        <SvgButton x={410} y={254} w={180} h={56} fontSize={17} label="Sort again" onClick={() => setDone([])} />
      )}
      {drag && card && (
        <g transform={`translate(${drag.x} ${drag.y})`} style={{ pointerEvents: 'none' }}>
          <PostCard post={card} />
        </g>
      )}
    </g>
  );
}

function PostCard({ post }: { post: (typeof POSTS)[number] }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={-110} y={-86} width={220} height={172} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <Emoji e={post.emoji} x={0} y={-40} size={46} />
      <Lines text={post.text} x={0} y={12} max={20} size={17} lh={22} anchor="middle" weight={700} />
    </g>
  );
}

/* ---------- Day balance ---------- */

type Act = 'sleep' | 'school' | 'screens' | 'active' | 'people' | 'homework';
const ACTS: { id: Act; emoji: string; name: string; colour: string }[] = [
  { id: 'sleep', emoji: '😴', name: 'Sleep', colour: C.purple },
  { id: 'school', emoji: '🏫', name: 'School', colour: C.blue },
  { id: 'screens', emoji: '🎮', name: 'Fun screen time', colour: C.orange },
  { id: 'active', emoji: '⚽', name: 'Active play', colour: C.green },
  { id: 'people', emoji: '👨‍👩‍👧', name: 'Family and friends', colour: C.pink },
  { id: 'homework', emoji: '📚', name: 'Homework, jobs', colour: C.teal },
];

function BalanceTab({ setNote }: { setNote: SetNote }) {
  const [h, setH] = useState<Record<Act, number>>({ sleep: 8, school: 7, screens: 6, active: 0, people: 2, homework: 1 });
  const total = ACTS.reduce((t, a) => t + h[a.id], 0);
  const change = (id: Act, d: number) => {
    const v = h[id] + d;
    if (v < 0 || (d > 0 && total >= 24)) {
      if (d > 0) setNote({ text: 'The day only has 24 hours. Take time from something else first.', tone: 'nudge' });
      return;
    }
    const next = { ...h, [id]: v };
    setH(next);
    const t = ACTS.reduce((s, a) => s + next[a.id], 0);
    const tips: string[] = [];
    if (next.sleep < 9) tips.push('Children your age need about 9 to 12 hours of sleep.');
    if (next.active < 1) tips.push('Try to move and play for at least an hour a day.');
    if (next.people < 1) tips.push('Leave some time for family and friends.');
    if (tips.length) setNote({ text: tips[0], tone: 'info' });
    else if (t === 24) {
      play('correct');
      setNote({ text: 'A balanced day: plenty of sleep, time to move, people, and some fun on screens too.', tone: 'good' });
    } else setNote({ text: `${24 - t} hours not planned yet.`, tone: 'info' });
  };
  const X0 = 40;
  const W = 920;
  let at = 0;
  return (
    <g>
      <text x={40} y={118} fontSize={15} fill={C.muted} className="caps">
        {`One school day · 24 hours · planned ${total}`}
      </text>
      <rect x={X0} y={130} width={W} height={56} rx={10} fill={C.paper} stroke={C.ink} strokeWidth={2} />
      {ACTS.map((a) => {
        const w = (h[a.id] / 24) * W;
        const x = X0 + (at / 24) * W;
        at += h[a.id];
        return w > 0 ? (
          <g key={a.id}>
            <rect x={x} y={130} width={w} height={56} fill={a.colour} stroke={C.ink} strokeWidth={1.5} />
            {w >= 38 && <Emoji e={a.emoji} x={x + w / 2} y={158} size={26} />}
          </g>
        ) : null;
      })}
      {ACTS.map((a, i) => {
        const x = 40 + (i % 2) * 470;
        const y = 210 + Math.floor(i / 2) * 92;
        return (
          <g key={a.id}>
            <rect x={x} y={y} width={450} height={78} rx={14} fill={C.card} stroke={C.line} strokeWidth={1.5} />
            <rect x={x} y={y} width={10} height={78} rx={4} fill={a.colour} />
            <Emoji e={a.emoji} x={x + 44} y={y + 39} size={30} />
            <text x={x + 76} y={y + 46} fontSize={18} fontWeight={700} fill={C.ink}>
              {a.name}
            </text>
            <SvgButton x={x + 262} y={y + 12} w={56} h={54} fontSize={24} label="−" title={`Less ${a.name}`} disabled={h[a.id] === 0 || a.id === 'school'} onClick={() => change(a.id, -1)} />
            <text x={x + 352} y={y + 48} textAnchor="middle" fontSize={20} fontWeight={800} fill={C.ink}>
              {h[a.id]}h
            </text>
            <SvgButton x={x + 386} y={y + 12} w={56} h={54} fontSize={24} label="+" title={`More ${a.name}`} disabled={a.id === 'school'} onClick={() => change(a.id, 1)} />
          </g>
        );
      })}
    </g>
  );
}

/* ---------- Scene ---------- */

const TABS: { id: Tab; label: string; intro: string }[] = [
  { id: 'privacy', label: '🛡️ Privacy', intro: 'Tap each setting to choose the safest option and fill the privacy shield.' },
  { id: 'pass', label: '🔑 Passphrase', intro: 'Build a practice passphrase from word tiles. Watch the strength meter.' },
  { id: 'footprint', label: '👣 Footprint', intro: 'Everything you post leaves a footprint. Drag each post: fine to post, or think twice?' },
  { id: 'balance', label: '⚖️ Balance', intro: 'Plan a balanced school day. School is fixed: change the rest.' },
];

function CitizenScene() {
  const [tab, setTab] = useState<Tab>('privacy');
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' }>({ text: TABS[0].intro, tone: 'info' });
  return (
    <SceneSvg label="Digital citizenship: privacy, passphrases, footprint and balance">
      {TABS.map((t, i) => (
        <SvgButton
          key={t.id}
          x={40 + i * 232}
          y={20}
          w={224}
          h={56}
          fontSize={17}
          label={t.label}
          active={t.id === tab}
          color={t.id === tab ? shade(C.yellow, 0.6) : C.card}
          onClick={() => {
            setTab(t.id);
            setNote({ text: t.intro, tone: 'info' });
          }}
        />
      ))}
      {tab === 'privacy' && <PrivacyTab setNote={setNote} />}
      {tab === 'pass' && <PassTab setNote={setNote} />}
      {tab === 'footprint' && <FootprintTab setNote={setNote} />}
      {tab === 'balance' && <BalanceTab setNote={setNote} />}
      <Note x={40} y={tab === 'balance' ? 492 : 534} w={tab === 'balance' ? 920 : tab === 'footprint' ? 920 : 620} text={note.text} tone={note.tone} />
      {tab !== 'footprint' && tab !== 'balance' && <SvgButton x={690} y={534} w={140} h={50} fontSize={16} label="Say it" onClick={() => speak(note.text, { force: true })} />}
      {tab === 'pass' && <Callout at={[350, 386]} box={[372, 448]} w={280} icon={KeyRound} title="Three random words" text="Three or more random words make a password that is long, memorable and hard to guess." />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <path d="M60 8 L92 20 V42 C92 58 78 68 60 74 C42 68 28 58 28 42 V20 Z" fill={shade(C.green, 0.6)} stroke={C.ink} strokeWidth={2.5} />
      <rect x={48} y={38} width={24} height={20} rx={4} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <path d="M52 38 V32 a8 8 0 0 1 16 0 V38" fill="none" stroke={C.ink} strokeWidth={2.5} />
    </svg>
  );
}

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.5) {
      const words = shuffle(WORDS).slice(0, 3).map(cap).join('');
      return choiceQuestion({
        prompt: 'Which is the strongest password idea?',
        right: { value: words },
        wrong: shuffle(['password1', '123456', 'Sam2014']).slice(0, 2).map((value) => ({ value })),
        hint: 'Long and random beats short and easy to guess.',
        explain: ['Common words, number runs, names and birth years are easy to guess.', `“${words}” is three random words: long and hard to guess.`],
      });
    }
    const s = pick(SETTINGS);
    return choiceQuestion({
      prompt: `“${s.label}”: which choice keeps you safer?`,
      right: { value: s.safe },
      wrong: [{ value: s.risky }],
      hint: 'Which choice shares less with people you don’t know?',
      explain: [s.why, `So “${s.safe}” is safer.`],
    });
  }

  if (level === 1) {
    if (Math.random() < 0.5) {
      const ok = pick(POSTS.filter((p) => p.ok));
      return choiceQuestion({
        prompt: 'Which one is fine to post?',
        right: { value: ok.text, label: <EmojiLabel e={ok.emoji} text={ok.text} />, name: ok.text },
        wrong: shuffle(POSTS.filter((p) => !p.ok))
          .slice(0, 2)
          .map((p) => ({ value: p.text, label: <EmojiLabel e={p.emoji} text={p.text} />, name: p.text })),
        hint: 'Is it kind, and is it yours to share?',
        explain: ['Posts stay online for a long time.', `“${ok.text}” is kind and yours to share, so it is fine to post.`],
      });
    }
    const c = pick([
      { topic: 'cats are better than dogs', right: 'I see why you like cats. I prefer dogs because they love walks.' },
      { topic: 'summer is the best season', right: 'Summer is fun! I like winter more because of the snow.' },
      { topic: 'the film was boring', right: 'Fair enough. I enjoyed it because the ending surprised me.' },
    ]);
    return choiceQuestion({
      prompt: `In a group chat, a friend says ${c.topic}. You disagree. Which reply is respectful?`,
      visual: <EmojiRow items={['💬', '🤝']} label="A chat and a handshake" />,
      right: { value: c.right },
      wrong: [{ value: 'That’s a silly opinion.' }, { value: 'Everyone knows you’re wrong!' }],
      hint: 'You can disagree with an idea and still be kind to the person.',
      explain: ['A respectful reply shows you heard them, then gives your view and a reason.', `“${c.right}” does both.`],
    });
  }

  const kind = pick(['footprint', 'holiday', 'balance'] as const);
  if (kind === 'footprint') {
    return choiceQuestion({
      prompt: 'Everything you post online can be saved and found years later. What is this trail called?',
      right: { value: 'Your digital footprint' },
      wrong: [{ value: 'Your screen time' }, { value: 'Your password' }],
      hint: 'Think about the marks you leave behind when you walk on sand.',
      explain: ['Like footprints in sand, posts leave a trail behind you.', 'That trail is called your digital footprint.'],
    });
  }
  if (kind === 'holiday') {
    return choiceQuestion({
      prompt: 'Why is it better to wait until you’re home to post holiday photos?',
      right: { value: 'Posting while away shows your home is empty' },
      wrong: [{ value: 'Holiday photos are not allowed online' }, { value: 'Photos look better after a few days' }],
      hint: 'What could a stranger learn from a “we’re away for two weeks!” post?',
      explain: ['A post while you’re away tells people nobody is home.', 'So the reason is: posting while away shows your home is empty.'],
    });
  }
  const right = '1 hour outside, 1 hour of screens, 1 hour with family';
  return choiceQuestion({
    prompt: 'You have 3 free hours after school. Which plan is most balanced?',
    visual: <EmojiRow items={['⚽', '🎮', '👨‍👩‍👧']} label="Outside play, screens and family" />,
    right: { value: right },
    wrong: [{ value: '3 hours of screens' }, { value: '3 hours of homework, no breaks' }],
    hint: 'A balanced plan mixes different things your body and brain need.',
    explain: ['Balance means a mix: moving, people, and some fun on screens.', `So “${right}” is the most balanced.`],
  });
}

export const digitalCitizenship: Lesson = {
  id: 'digital-citizenship',
  title: 'Digital Citizenship',
  Thumb,
  Scene: CitizenScene,
  sceneHint: 'Try each tab: privacy settings, passphrases, footprint and a balanced day',
  learn: {
    heading: 'Being smart, safe and kind online',
    intro: 'A good digital citizen protects their privacy, keeps accounts secure, thinks before posting, treats people with respect, and balances screens with the rest of life.',
    points: [
      { icon: ShieldCheck, text: 'Set privacy to “friends only” and turn location sharing off.' },
      { icon: KeyRound, text: 'Use a passphrase of three or more random words. Keep it secret (except from your grown-up).' },
      { icon: Footprints, text: 'Your posts leave a digital footprint that can last for years.' },
      { icon: MessageSquareHeart, text: 'Disagree with ideas, not people: listen, then give your reason kindly.' },
      { icon: Scale, text: 'Balance screens with sleep (about 9–12 hours), moving and people.' },
    ],
  },
  steps: ['Check privacy settings on every app.', 'Make passphrases from random words; never share them.', 'Before posting, ask: is it kind, is it mine to share, would I mind it being seen in 10 years?', 'Plan your day so screens leave room for sleep, moving and people.'],
  example: {
    question: 'Which is the stronger passphrase: “Mia2014” or “OtterCometWaffle”?',
    work: ['“Mia2014” is a name and a birth year: easy to guess.', '“OtterCometWaffle” is three random words: long and hard to guess.'],
    answer: '“OtterCometWaffle” is stronger.',
  },
  grownups: [
    'Set up privacy settings together and revisit them when apps update.',
    'A password manager or a written list kept somewhere safe at home helps with many passphrases.',
    'Agree on screen-time habits as a family (for example, no screens at meals or in the hour before bed) rather than only setting limits.',
  ],
  makeQuestion,
};
