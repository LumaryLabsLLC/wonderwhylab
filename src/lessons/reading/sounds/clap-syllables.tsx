import { useEffect, useRef, useState } from 'react';
import { Drum, Hand, Volume2 } from 'lucide-react';
import type { Lesson, Question } from '../../types';
import { C, shade } from '../../../lib/color';
import { play } from '../../../lib/sound';
import { speak } from '../../../lib/speech';
import { Callout } from '../../../stage/Callout';
import { SceneSvg, SvgButton } from '../../../stage/widgets';
import { SYLLABLES, pic, pick, shuffle, syllableWords, wordOf } from './data';
import { mcq, level3 } from './q';
import { Emoji, Note, PicCard, PicChoice, PicVisual, Tap } from './visuals/Pictures';

const CHUNK_COLORS = [C.red, C.blue, C.green, C.purple];
const DRUM = { x: 640, y: 255, r: 110 };

function ClapScene() {
  const [syl, setSyl] = useState<string[]>(() => pick(SYLLABLES.filter((s) => s.length === 2)));
  const [taps, setTaps] = useState(0);
  const [checked, setChecked] = useState(false);
  const [showing, setShowing] = useState(-1);
  const [bounce, setBounce] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const word = wordOf(syl);
  const right = taps === syl.length;

  useEffect(() => () => window.clearInterval(timer.current), []);

  const hit = () => {
    if (checked) return;
    setTaps((t) => Math.min(4, t + 1));
    setBounce((b) => b + 1);
    play('tap');
  };

  const check = () => {
    if (taps === 0) return;
    setChecked(true);
    play(taps === syl.length ? 'correct' : 'wrong');
  };

  const showMe = () => {
    window.clearInterval(timer.current);
    speak(`${syl.join(', ')}. ${word}`, { force: true });
    let k = 0;
    setShowing(0);
    play('tap');
    timer.current = window.setInterval(() => {
      k += 1;
      if (k >= syl.length) {
        window.clearInterval(timer.current);
        window.setTimeout(() => setShowing(-1), 600);
        return;
      }
      setShowing(k);
      play('tap');
    }, 650);
  };

  const reset = () => {
    setTaps(0);
    setChecked(false);
  };

  const next = () => {
    const pool = SYLLABLES.filter((s) => wordOf(s) !== word);
    setSyl(pick(pool));
    reset();
    setShowing(-1);
    play('pop');
  };

  const chunkW = 128;
  const chunksX = 500 - (syl.length * chunkW + (syl.length - 1) * 10) / 2;

  return (
    <SceneSvg label={`Clap the beats in ${word}`}>
      <Tap label={`${word}. Tap to hear it slowly.`} onTap={() => speak(`${syl.join(', ')}. ${word}`, { force: true })}>
        <g transform="translate(250 230)">
          <PicCard emoji={pic(word)} word={word} w={240} h={250} size={130} />
        </g>
        <g transform="translate(345 120)">
          <circle r={22} fill={C.blue} stroke={C.ink} strokeWidth={2} />
          <Volume2 x={-12} y={-12} size={24} color={C.white} />
        </g>
      </Tap>

      <g
        role="button"
        aria-label="Drum. Tap once for each beat."
        tabIndex={0}
        data-nopan
        style={{ cursor: 'pointer' }}
        onClick={hit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            hit();
          }
        }}
      >
        <g key={bounce}>
          {bounce > 0 && <animateTransform attributeName="transform" type="translate" values="0 0; 0 8; 0 0" dur="0.18s" />}
          <ellipse cx={DRUM.x} cy={DRUM.y + 70} rx={DRUM.r} ry={34} fill={shade(C.red, -0.2)} stroke={C.ink} strokeWidth={3} />
          <rect x={DRUM.x - DRUM.r} y={DRUM.y} width={DRUM.r * 2} height={70} fill={C.red} stroke={C.ink} strokeWidth={3} />
          {[-70, -25, 25, 70].map((dx) => (
            <path key={dx} d={`M${DRUM.x + dx} ${DRUM.y + 4} l${dx > 0 ? -18 : 18} 62`} stroke={C.yellow} strokeWidth={4} />
          ))}
          <ellipse cx={DRUM.x} cy={DRUM.y} rx={DRUM.r} ry={34} fill={shade(C.yellow, 0.75)} stroke={C.ink} strokeWidth={3} />
          <text x={DRUM.x} y={DRUM.y + 4} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill={C.ink}>
            Tap!
          </text>
        </g>
      </g>

      {/* Beat dots */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={DRUM.x - 105 + i * 70} cy={DRUM.y + 150} r={22} fill={i < taps ? C.yellow : C.white} stroke={i < taps ? C.ink : C.line} strokeWidth={i < taps ? 3 : 2} className={i === taps - 1 ? 'pop-in' : undefined} style={{ transformOrigin: `${DRUM.x - 105 + i * 70}px ${DRUM.y + 150}px` }} />
      ))}
      <text x={DRUM.x} y={DRUM.y + 196} textAnchor="middle" fontSize={17} fill={C.muted}>
        {taps === 0 ? 'Say the word and tap once for each beat' : `${taps} ${taps === 1 ? 'tap' : 'taps'}`}
      </text>

      {/* The word split into beats */}
      {(checked || showing >= 0) &&
        syl.map((s, i) => (
          <g key={i} transform={`translate(${chunksX + i * (chunkW + 10)} 500)`}>
            <rect width={chunkW} height={64} rx={14} fill={showing === -1 || showing === i ? shade(CHUNK_COLORS[i], 0.7) : C.white} stroke={C.ink} strokeWidth={showing === i ? 4 : 2} />
            <text x={chunkW / 2} y={34} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill={C.ink}>
              {s}
            </text>
          </g>
        ))}
      {checked && showing < 0 && (
        <Note
          x={220}
          y={584}
          w={560}
          h={56}
          tone={right ? 'good' : 'try'}
          text={right ? `Yes! ${word} has ${syl.length} ${syl.length === 1 ? 'beat' : 'beats'}.` : `Not yet: you tapped ${taps}. Say it slowly and try again.`}
        />
      )}

      <SvgButton x={790} y={150} w={180} h={52} fontSize={18} label="Check" onClick={check} disabled={taps === 0 || checked} color={C.yellow} />
      <SvgButton x={790} y={218} w={180} h={52} fontSize={18} label="Start again" onClick={reset} disabled={taps === 0} />
      <SvgButton x={790} y={286} w={180} h={52} fontSize={18} label="Show me" onClick={showMe} />
      <SvgButton x={790} y={354} w={180} h={52} fontSize={18} label="Next word" onClick={next} color={checked && right ? C.yellow : C.card} />

      <Callout at={[DRUM.x, DRUM.y - 20]} box={[470, 30]} w={220} icon={Drum} title="One tap, one beat" text="Beats are the chunks you hear: ap-ple has 2." />
      <Callout at={[250, 340]} box={[30, 560]} w={200} icon={Hand} title="Clap it" text="Put a hand under your chin. It drops once for each beat!" />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <Emoji emoji="🍌" x={30} y={36} size={36} />
      <ellipse cx={86} cy={52} rx={26} ry={9} fill={shade(C.red, -0.2)} stroke={C.ink} strokeWidth={2} />
      <rect x={60} y={34} width={52} height={18} fill={C.red} stroke={C.ink} strokeWidth={2} />
      <ellipse cx={86} cy={34} rx={26} ry={9} fill={shade(C.yellow, 0.7)} stroke={C.ink} strokeWidth={2} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={14 + i * 16} cy={70} r={6} fill={C.yellow} stroke={C.ink} strokeWidth={1.5} />
      ))}
    </svg>
  );
}

const beatsWord = (n: number) => `${n} ${n === 1 ? 'clap' : 'claps'}`;
const said = (s: string[]) => s.join(' – ');

function makeQuestion(level: number): Question {
  const lv = level3(level);
  if (lv < 2) {
    const syl = pick(syllableWords(lv === 0 ? 2 : 3));
    const word = wordOf(syl);
    const n = syl.length;
    const options = lv === 0 ? ['1', '2'] : ['1', '2', '3'];
    return mcq({
      prompt: `How many claps in ${word}?`,
      visual: <PicVisual emoji={pic(word)} word={word} />,
      answer: String(n),
      wrong: options.filter((o) => o !== String(n)),
      hint: 'Say the word slowly and clap each time your mouth opens.',
      explain: [`Clap as you say it: ${said(syl)}.`, `That's ${beatsWord(n)}.`, `${word} has ${n} ${n === 1 ? 'beat' : 'beats'}.`],
    });
  }
  // Which picture has n beats? One word with that many beats, two with other counts.
  const n = pick([1, 2, 3]);
  const others = [1, 2, 3].filter((k) => k !== n);
  const target = pick(SYLLABLES.filter((s) => s.length === n));
  const wrongSyl = others.map((k) => pick(SYLLABLES.filter((s) => s.length === k)));
  const words = [target, ...wrongSyl].map(wordOf);
  return mcq({
    prompt: `Which one has ${beatsWord(n)}?`,
    answer: wordOf(target),
    wrong: wrongSyl.map(wordOf),
    labels: Object.fromEntries(words.map((w) => [w, <PicChoice emoji={pic(w)} />])),
    names: Object.fromEntries(words.map((w) => [w, w])),
    hint: 'Clap each picture’s name. Count the claps.',
    explain: [
      `Clap each one: ${shuffle([target, ...wrongSyl]).map((s) => `${said(s)} (${s.length})`).join(', ')}.`,
      `${wordOf(target)} has ${beatsWord(n)}.`,
    ],
  });
}

export const clapSyllables: Lesson = {
  id: 'clap-syllables',
  title: 'Clap the Beats',
  Thumb,
  Scene: ClapScene,
  sceneHint: 'Say the word · Tap the drum once for each beat · Check',
  learn: {
    heading: 'Beats in words',
    intro: 'Words have beats called syllables. Cat has 1 beat. Ap-ple has 2. Ba-na-na has 3!',
    points: [
      { icon: Hand, text: 'Clap or tap once for each beat you hear.' },
      { icon: Volume2, text: 'Say the word slowly, like a robot.' },
      { icon: Drum, text: 'Long words often have more beats.' },
    ],
  },
  steps: ['Say the word out loud.', 'Say it again slowly, in chunks.', 'Clap once for each chunk.', 'Count your claps. That’s how many beats!'],
  example: {
    question: 'How many beats in butterfly?',
    visual: <PicVisual emoji={pic('butterfly')} word="butterfly" />,
    work: ['Say it slowly: but – ter – fly.', 'Clap: one, two, three.'],
    answer: 'Butterfly has 3 beats.',
  },
  grownups: [
    'Hearing syllables is an early step in phonological awareness, before children hear single sounds.',
    'Try the chin trick: hand under the chin, say the word, and count how many times the chin drops.',
    'Clap the beats in family names. It’s a game children love and it needs no screen.',
    'Don’t worry about exact syllable rules; hearing and counting the chunks is the goal.',
  ],
  makeQuestion,
};
