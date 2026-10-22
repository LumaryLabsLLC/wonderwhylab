import { useState } from 'react';
import { Ban, Hand, Heart, Lock, MessageCircleHeart } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { pick, shuffle } from '../../../lib/random';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import type { Pt } from '../../../lib/svg';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { choiceQuestion } from '../shared/q';
import { Face, FEELING_FACE } from '../shared/Face';
import { Card, DragItem, Emoji, EmojiLabel, EmojiPicture, EmojiRow, inside, Lines, Note, Tap } from '../shared/kit';
import type { Box } from '../shared/kit';

type Tab = 'sort' | 'stop' | 'kind';

interface Info {
  emoji: string;
  text: string;
  ok: boolean;
  why: string;
}

const INFO: Info[] = [
  { emoji: '🎨', text: 'Your favourite colour', ok: true, why: 'A favourite colour doesn’t tell anyone who you are or where to find you.' },
  { emoji: '🏠', text: 'Your home address', ok: false, why: 'An address says where you live, so keep it private.' },
  { emoji: '⚽', text: 'Your favourite sport', ok: true, why: 'Talking about a sport you like is fine.' },
  { emoji: '📞', text: 'Your phone number', ok: false, why: 'A phone number lets strangers contact you, so keep it private.' },
  { emoji: '📚', text: 'A book you enjoyed', ok: true, why: 'Sharing a book you liked is fine.' },
  { emoji: '🔑', text: 'Your password', ok: false, why: 'Passwords are only for you and your grown-ups.' },
  { emoji: '🏫', text: 'The name of your school', ok: false, why: 'Your school’s name helps someone find you, so keep it private.' },
  { emoji: '🐉', text: 'A drawing of a dragon', ok: true, why: 'A drawing is fine to share (with a grown-up’s OK).' },
];

const MESSAGES = [
  { from: 'Unknown player', text: 'Hi! What’s your address? I want to send you a free prize!' },
  { from: 'Someone in the game', text: 'You’re rubbish at this. Nobody wants you on the team.' },
];

const STEPS = [
  { id: 'stop', emoji: '✋', title: 'Stop', text: 'Don’t reply or click.' },
  { id: 'block', emoji: '🚫', title: 'Block', text: 'Block or report them.' },
  { id: 'tell', emoji: '🧑‍🏫', title: 'Tell', text: 'Tell a trusted grown-up.' },
];

const REPLIES = [
  { text: 'I love the colours you used!', kind: true },
  { text: 'LOL what is that meant to be?', kind: false },
  { text: 'Cool dragon! How did you draw the wings?', kind: true },
  { text: 'Mine is way better.', kind: false },
];

const SHARE: Box = { x: 40, y: 100, w: 300, h: 420 };
const PRIVATE: Box = { x: 660, y: 100, w: 300, h: 420 };

function SortTab({ setNote }: { setNote: (n: { text: string; tone: 'good' | 'nudge' | 'info' }) => void }) {
  const [order] = useState(() => shuffle(INFO));
  const [done, setDone] = useState<Info[]>([]);
  const [drag, setDrag] = useState<Pt | null>(null);
  const card = order[done.length];

  const place = (ok: boolean) => {
    if (!card) return;
    if (card.ok !== ok) {
      play('wrong');
      setNote({ text: `Not yet. ${card.why}`, tone: 'nudge' });
      return;
    }
    play('pop');
    const next = [...done, card];
    setDone(next);
    if (next.length === INFO.length) {
      play('complete');
      setNote({ text: 'All sorted! Things about what you like are fine. Things that say who or where you are stay private.', tone: 'good' });
    } else setNote({ text: card.why, tone: 'good' });
  };

  const bin = (b: Box, ok: boolean) => {
    const items = done.filter((d) => d.ok === ok);
    return (
      <Card x={b.x} y={b.y} w={b.w} h={b.h} fill={shade(ok ? C.green : C.purple, 0.85)}>
        <Emoji e={ok ? '👍' : '🔒'} x={b.x + 34} y={b.y + 34} size={30} />
        <text x={b.x + 62} y={b.y + 42} fontSize={20} fontWeight={800} fill={C.ink}>
          {ok ? 'OK to share' : 'Keep private'}
        </text>
        {items.map((d, i) => (
          <g key={d.text}>
            <rect x={b.x + 14} y={b.y + 70 + i * 84} width={b.w - 28} height={72} rx={12} fill={C.card} stroke={C.line} strokeWidth={1.5} />
            <Emoji e={d.emoji} x={b.x + 46} y={b.y + 106 + i * 84} size={30} />
            <Lines text={d.text} x={b.x + 76} y={d.text.length > 20 ? b.y + 100 + i * 84 : b.y + 112 + i * 84} max={20} size={16} lh={20} />
          </g>
        ))}
      </Card>
    );
  };

  return (
    <g>
      {bin(SHARE, true)}
      {bin(PRIVATE, false)}
      {card ? (
        <>
          <text x={500} y={128} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
            {`Card ${done.length + 1} of ${INFO.length} · drag it`}
          </text>
          <DragItem
            key={card.text}
            at={{ x: 500, y: 250 }}
            r={100}
            label={card.text}
            dragging={!!drag}
            onMove={setDrag}
            onDrop={(p) => {
              setDrag(null);
              if (inside(p, SHARE)) place(true);
              else if (inside(p, PRIVATE)) place(false);
            }}
          >
            <InfoCard info={card} />
          </DragItem>
          <SvgButton x={380} y={372} w={114} h={56} fontSize={15} label="◀ Share" title="OK to share" onClick={() => place(true)} />
          <SvgButton x={506} y={372} w={114} h={56} fontSize={15} label="Private ▶" title="Keep private" onClick={() => place(false)} />
        </>
      ) : (
        <SvgButton x={410} y={250} w={180} h={56} fontSize={17} label="Sort again" onClick={() => setDone([])} />
      )}
      {drag && card && (
        <g transform={`translate(${drag.x} ${drag.y})`} style={{ pointerEvents: 'none' }}>
          <InfoCard info={card} />
        </g>
      )}
    </g>
  );
}

function InfoCard({ info }: { info: Info }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={-105} y={-82} width={210} height={164} rx={16} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <Emoji e={info.emoji} x={0} y={-34} size={48} />
      <Lines text={info.text} x={0} y={info.text.length > 18 ? 22 : 34} max={18} size={18} lh={22} anchor="middle" weight={700} />
    </g>
  );
}

function StopTab({ setNote }: { setNote: (n: { text: string; tone: 'good' | 'nudge' | 'info' }) => void }) {
  const [msg, setMsg] = useState(0);
  const [order, setOrder] = useState(() => shuffle(STEPS));
  const [got, setGot] = useState(0);
  const m = MESSAGES[msg];

  const tap = (id: string) => {
    const want = STEPS[got];
    if (!want || STEPS.findIndex((s) => s.id === id) < got) return;
    if (id !== want.id) {
      play('wrong');
      setNote({ text: `Not yet. First comes ${want.title}: ${want.text.toLowerCase()}`, tone: 'nudge' });
      return;
    }
    play(got === 2 ? 'complete' : 'pop');
    setGot(got + 1);
    setNote(
      got === 2
        ? { text: 'Stop, Block, Tell. You did it! If something online feels wrong, it is never your fault, and a grown-up can help.', tone: 'good' }
        : { text: `${want.title}: ${want.text} What comes next?`, tone: 'info' },
    );
  };

  return (
    <g>
      {/* A pretend tablet with a message. */}
      <rect x={60} y={100} width={400} height={420} rx={30} fill={C.ink} />
      <rect x={78} y={118} width={364} height={384} rx={16} fill={shade(C.blue, 0.88)} />
      <circle cx={118} cy={168} r={26} fill={C.line} stroke={C.ink} strokeWidth={2} />
      <text x={118} y={176} textAnchor="middle" fontSize={24} fontWeight={800} fill={C.ink2}>
        ?
      </text>
      <text x={156} y={174} fontSize={17} fontWeight={700} fill={C.ink}>
        {m.from}
      </text>
      <rect x={96} y={208} width={328} height={130} rx={18} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <Lines text={m.text} x={114} y={242} max={30} size={18} lh={26} />
      {got >= 2 && (
        <g>
          <rect x={96} y={360} width={328} height={50} rx={12} fill={shade(C.red, 0.8)} stroke={C.ink} strokeWidth={1.5} />
          <text x={260} y={392} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
            🚫 Blocked
          </text>
        </g>
      )}
      {got >= 3 && <Emoji e="🧑‍🏫" x={380} y={460} size={52} />}

      <text x={520} y={124} fontSize={15} fill={C.muted} className="caps">
        Tap the steps in order
      </text>
      {order.map((s, i) => {
        const n = STEPS.findIndex((t) => t.id === s.id);
        const on = n < got;
        const y = 140 + i * 112;
        return (
          <Tap key={s.id} label={`${s.title}: ${s.text}`} onTap={() => tap(s.id)}>
            <Card x={520} y={y} w={420} h={96} fill={on ? shade(C.green, 0.8) : C.card}>
              <Emoji e={s.emoji} x={566} y={y + 48} size={40} />
              <text x={612} y={y + 42} fontSize={22} fontWeight={800} fill={C.ink}>
                {s.title}
              </text>
              <text x={612} y={y + 70} fontSize={17} fill={C.ink2}>
                {s.text}
              </text>
              {on && (
                <g>
                  <circle cx={906} cy={y + 48} r={20} fill={C.green} stroke={C.ink} strokeWidth={2} />
                  <text x={906} y={y + 55} textAnchor="middle" fontSize={19} fontWeight={800} fill={C.white}>
                    {n + 1}
                  </text>
                </g>
              )}
            </Card>
          </Tap>
        );
      })}
      <SvgButton
        x={520}
        y={478}
        w={200}
        h={48}
        fontSize={16}
        label="Another message"
        onClick={() => {
          setMsg((msg + 1) % MESSAGES.length);
          setOrder(shuffle(STEPS));
          setGot(0);
          setNote({ text: 'A new message. What do you do?', tone: 'info' });
        }}
      />
      <SvgButton x={740} y={478} w={200} h={48} fontSize={16} label="Say it" onClick={() => speak('Stop. Block. Tell a trusted grown-up.', { force: true })} />
    </g>
  );
}

function KindTab({ setNote }: { setNote: (n: { text: string; tone: 'good' | 'nudge' | 'info' }) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const r = picked === null ? null : REPLIES[picked];
  return (
    <g>
      <Card x={60} y={100} w={400} h={420}>
        <text x={84} y={136} fontSize={17} fontWeight={700} fill={C.ink}>
          Your friend posted:
        </text>
        <text x={84} y={164} fontSize={17} fill={C.ink2}>
          “Look what I drew!”
        </text>
        <rect x={100} y={180} width={320} height={160} rx={14} fill={shade(C.yellow, 0.8)} stroke={C.ink} strokeWidth={1.5} />
        <Emoji e="🐉" x={260} y={262} size={96} />
        {r && (
          <g>
            <rect x={84} y={356} width={250} height={70} rx={14} fill={shade(C.blue, 0.85)} stroke={C.ink} strokeWidth={1.5} />
            <Lines text={r.text} x={98} y={384} max={24} size={16} lh={20} />
            <Face cx={390} cy={440} r={50} parts={r.kind ? FEELING_FACE.happy : FEELING_FACE.sad} />
          </g>
        )}
      </Card>
      <text x={520} y={124} fontSize={15} fill={C.muted} className="caps">
        Tap a reply to send it
      </text>
      {REPLIES.map((x, i) => {
        const y = 140 + i * 96;
        const on = i === picked;
        return (
          <Tap
            key={x.text}
            label={x.text}
            onTap={() => {
              setPicked(i);
              play(x.kind ? 'correct' : 'tap');
              setNote(
                x.kind
                  ? { text: 'That reply is kind and specific. Your friend feels proud. Kind words online make the internet a nicer place.', tone: 'good' }
                  : { text: 'Look at your friend’s face. Words online can hurt as much as words face to face. Would you say it in person?', tone: 'nudge' },
              );
            }}
          >
            <Card x={520} y={y} w={420} h={82} fill={on ? shade(x.kind ? C.green : C.yellow, 0.75) : C.card}>
              <Emoji e="💬" x={556} y={y + 41} size={28} />
              <Lines text={x.text} x={586} y={x.text.length > 30 ? y + 36 : y + 47} max={30} size={17} lh={22} />
            </Card>
          </Tap>
        );
      })}
    </g>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'sort', label: 'Share or private?' },
  { id: 'stop', label: 'If something feels wrong' },
  { id: 'kind', label: 'Be kind online' },
];

const INTRO: Record<Tab, string> = {
  sort: 'Drag each card to “OK to share” or “Keep private”. Ask: does it tell someone who I am or where to find me?',
  stop: 'This message doesn’t feel right. Tap the three steps in the right order.',
  kind: 'Your friend shared a drawing. Choose a reply and see how it makes them feel.',
};

function SafetyScene() {
  const [tab, setTab] = useState<Tab>('sort');
  const [note, setNote] = useState<{ text: string; tone: 'good' | 'nudge' | 'info' }>({ text: INTRO.sort, tone: 'info' });
  return (
    <SceneSvg label="Staying safe and kind online">
      {TABS.map((t, i) => (
        <SvgButton
          key={t.id}
          x={40 + i * 312}
          y={20}
          w={296}
          h={56}
          fontSize={17}
          label={t.label}
          active={t.id === tab}
          color={t.id === tab ? shade(C.yellow, 0.6) : C.card}
          onClick={() => {
            setTab(t.id);
            setNote({ text: INTRO[t.id], tone: 'info' });
          }}
        />
      ))}
      {tab === 'sort' && <SortTab setNote={setNote} />}
      {tab === 'stop' && <StopTab setNote={setNote} />}
      {tab === 'kind' && <KindTab setNote={setNote} />}
      <Note x={40} y={546} w={920} text={note.text} tone={note.tone} />
      {tab === 'sort' && <Callout at={[660, 300]} box={[372, 446]} w={256} icon={Lock} title="Private = who or where" text="Your address, school, phone number and passwords stay private." />}
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <rect x={18} y={10} width={64} height={60} rx={10} fill={C.ink} />
      <rect x={24} y={16} width={52} height={48} rx={6} fill={shade(C.blue, 0.85)} />
      <text x={50} y={48} textAnchor="middle" fontSize={26}>
        🔒
      </text>
      <circle cx={96} cy={30} r={14} fill={C.green} stroke={C.ink} strokeWidth={2} />
      <text x={96} y={36} textAnchor="middle" fontSize={16}>
        ✋
      </text>
    </svg>
  );
}

const OK_ITEMS = INFO.filter((i) => i.ok);
const PRIVATE_ITEMS = INFO.filter((i) => !i.ok);
const item = (i: Info) => ({ value: i.text, label: <EmojiLabel e={i.emoji} text={i.text} />, name: i.text });

function makeQuestion(level: number): Question {
  if (level === 0) {
    if (Math.random() < 0.5) {
      const right = pick(OK_ITEMS);
      return choiceQuestion({
        prompt: 'Which one is OK to share online?',
        right: item(right),
        wrong: shuffle(PRIVATE_ITEMS).slice(0, 2).map(item),
        hint: 'Does it tell someone who you are or where to find you?',
        explain: ['Addresses, phone numbers, schools and passwords stay private.', `“${right.text}” doesn’t say who or where you are.`, 'So it is OK to share.'],
      });
    }
    const right = pick(PRIVATE_ITEMS);
    return choiceQuestion({
      prompt: 'Which one should you keep private?',
      right: item(right),
      wrong: shuffle(OK_ITEMS).slice(0, 2).map(item),
      hint: 'Which one could help a stranger find you or get into your account?',
      explain: [right.why, `So keep “${right.text}” private.`],
    });
  }

  if (level === 1) {
    const kind = pick(['stranger', 'tell', 'kind'] as const);
    if (kind === 'stranger') {
      return choiceQuestion({
        prompt: 'Someone you don’t know asks for your address in a game chat. What should you do?',
        visual: <EmojiRow items={['🎮', '💬', '🏠']} label="A game chat asking for an address" />,
        right: { value: 'Don’t reply, block them and tell a grown-up' },
        wrong: [{ value: 'Tell them, they seem friendly' }, { value: 'Keep it a secret from everyone' }],
        hint: 'Think: Stop, Block, Tell.',
        explain: ['Your address is private information.', 'Stop (don’t reply), Block, and Tell a trusted grown-up.', 'So: don’t reply, block them and tell a grown-up.'],
      });
    }
    if (kind === 'tell') {
      return choiceQuestion({
        prompt: 'A message online makes you feel upset or confused. Who should you tell?',
        visual: <EmojiPicture e="😟" caption="A message felt wrong" />,
        right: { value: 'A trusted grown-up', label: <EmojiLabel e="🧑‍🏫" text="A trusted grown-up" />, name: 'A trusted grown-up' },
        wrong: [
          { value: 'Nobody', label: <EmojiLabel e="🤐" text="Nobody" />, name: 'Nobody' },
          { value: 'The person who sent it', label: <EmojiLabel e="❓" text="The person who sent it" />, name: 'The person who sent it' },
        ],
        hint: 'Who can help you sort it out and keep you safe?',
        explain: ['You are never in trouble for telling.', 'A trusted grown-up, like a parent, carer or teacher, can help.', 'So tell a trusted grown-up.'],
      });
    }
    const right = pick(['That’s so cool! How did you make it?', 'Great job, I love the colours!']);
    return choiceQuestion({
      prompt: 'Your friend posts a video of a song they wrote. Which comment is kind?',
      visual: <EmojiPicture e="🎸" caption="A new song" />,
      right: { value: right },
      wrong: [{ value: 'Boring. Stop posting.' }, { value: 'LOL that is so bad.' }],
      hint: 'Which one would make your friend smile if you said it in person?',
      explain: ['Kind comments are friendly and specific.', `“${right}” would make your friend feel proud.`],
    });
  }

  const kind = pick(['username', 'photo', 'secret'] as const);
  if (kind === 'username') {
    const right = pick(['StarRunner', 'BlueDragon', 'PixelPanda']);
    return choiceQuestion({
      prompt: 'Which username keeps your personal information safest?',
      right: { value: right },
      wrong: [{ value: 'AmyJones2016' }, { value: 'Leo_ParkRoadSchool' }],
      hint: 'Look for real names, birth years or places hidden in the name.',
      explain: ['“AmyJones2016” shows a real name and birth year.', '“Leo_ParkRoadSchool” shows a name and a school.', `“${right}” shows nothing personal, so it is safest.`],
    });
  }
  if (kind === 'photo') {
    return choiceQuestion({
      prompt: 'With a grown-up’s OK, which photo is fine to post?',
      right: { value: 'A photo of your painting', label: <EmojiLabel e="🖼️" text="A photo of your painting" />, name: 'A photo of your painting' },
      wrong: [
        { value: 'You in uniform at your school gate', label: <EmojiLabel e="🏫" text="You in uniform at your school gate" />, name: 'You in uniform at your school gate' },
        { value: 'Your front door with the house number', label: <EmojiLabel e="🚪" text="Your front door with the house number" />, name: 'Your front door with the house number' },
      ],
      hint: 'Photos can show places too. Which one gives no clues about where you are?',
      explain: ['A school uniform and gate show where you go each day.', 'A house number shows where you live.', 'A photo of your painting gives no clues, so it is fine.'],
    });
  }
  return choiceQuestion({
    prompt: 'An online friend says, “Don’t tell your grown-ups about me.” What should you do?',
    visual: <EmojiRow items={['💬', '🤫']} label="A message asking to keep a secret" />,
    right: { value: 'Tell a trusted grown-up' },
    wrong: [{ value: 'Keep the secret' }, { value: 'Send them your phone number' }],
    hint: 'Safe friends never ask you to hide them from your grown-ups.',
    explain: ['Asking you to keep secrets from grown-ups is a warning sign.', 'You are never in trouble for telling.', 'So tell a trusted grown-up.'],
  });
}

export const onlineSafety: Lesson = {
  id: 'online-safety',
  title: 'Staying Safe Online',
  Thumb,
  Scene: SafetyScene,
  sceneHint: 'Sort what to share · Stop, Block, Tell · Choose kind replies',
  learn: {
    heading: 'Safe, smart and kind online',
    intro: 'The internet is great for games, learning and chatting with friends. A few simple habits keep you safe and help everyone have a good time.',
    points: [
      { icon: Lock, text: 'Keep private: your address, phone number, school and passwords.' },
      { icon: Hand, text: 'If something feels wrong: Stop. Don’t reply or click.' },
      { icon: Ban, text: 'Block or report people who are unkind or ask for private things.' },
      { icon: MessageCircleHeart, text: 'Tell a trusted grown-up. You are never in trouble for telling.' },
      { icon: Heart, text: 'Be kind: only post what you would say face to face.' },
    ],
  },
  steps: ['Before you share, ask: does this tell someone who I am or where to find me?', 'If yes, keep it private.', 'If a message feels wrong: Stop, Block, Tell.', 'Before you post a comment, ask: is it kind?'],
  example: {
    question: 'A player you don’t know asks which school you go to. What do you do?',
    visual: <EmojiRow items={['🎮', '🏫', '❓']} label="A player asking about your school" />,
    work: ['Your school name is private.', 'Stop: don’t answer. Block them.', 'Tell a trusted grown-up what happened.'],
    answer: 'Stop, Block, Tell.',
  },
  grownups: [
    'Agree on family rules together: which apps, when, and what to do if something feels wrong.',
    'Promise your child they will not lose their device for telling you about a problem; that keeps them telling.',
    'Use privacy settings and play in shared rooms with younger children.',
  ],
  makeQuestion,
};
