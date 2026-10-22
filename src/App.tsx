import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, MessageCircle, RotateCcw } from 'lucide-react';
import { findLesson, useModule } from './lessons';
import { findGame } from './games';
import type { Lesson, Module } from './lessons/types';
import type { Band } from './games/types';
import { getSettings, getState, recordLesson, recordPractice, update, useProgress } from './lib/progress';
import { play } from './lib/sound';
import { useNaturalVoiceStatus } from './lib/natural-voice';
import { prepareVoice, stopSpeaking } from './lib/speech';
import { Stage } from './stage/Stage';
import type { Insets } from './stage/Stage';
import { BrainBreak } from './components/BrainBreak';
import { GameShell, GamesHub, Loading } from './components/Games';
import { Home } from './components/Home';
import type { SubjectId } from './subjects';
import { SUBJECT_TITLES } from './subjects';
import { StoryReader, StoryShelf } from './components/Stories';
import { findStory } from './stories';
import { LessonPanel } from './components/LessonPanel';
import { LessonSwitcher } from './components/LessonSwitcher';
import { Review, dueLessons } from './components/Review';
import { SettingsModal } from './components/SettingsModal';
import { Stickers } from './components/Stickers';
import { SubjectPage } from './components/SubjectPage';
import { TopBar } from './components/TopBar';
import type { TopBarActions } from './components/TopBar';
import { StarRow, TryIt } from './components/TryIt';
import { AgePicker } from './components/Welcome';

const COMPACT_QUERY = '(max-width: 1079px), (max-height: 659px)';

function useCompact() {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const on = () => setCompact(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return compact;
}

const DESKTOP_INSETS: Insets = { top: 16, right: 412, bottom: 72, left: 16 };
const COMPACT_INSETS: Insets = { top: 8, right: 6, bottom: 54, left: 6 };
const GOAL = 5;

type Screen =
  | { name: 'home' }
  | { name: 'subject'; subject: SubjectId }
  | { name: 'games' }
  | { name: 'game'; id: string; back: Screen }
  | { name: 'lesson'; id: string }
  | { name: 'stories' }
  | { name: 'story'; id: string };

type Overlay = 'review' | 'stickers' | 'settings' | 'age' | null;

const SUBJECT_NAMES = SUBJECT_TITLES;

export default function App() {
  const compact = useCompact();
  const band = useProgress((s) => s.band);
  const age = (band ?? 0) as Band;
  const [screen, setScreen] = useState<Screen>(() => {
    const linked = getState().openLesson;
    if (linked && findLesson(linked)) return { name: 'lesson', id: linked };
    const params = new URLSearchParams(window.location.search);
    const game = params.get('game');
    if (game && findGame(game)) return { name: 'game', id: game, back: { name: 'games' } };
    const story = params.get('story');
    if (story && findStory(story)) return { name: 'story', id: story };
    return { name: 'home' };
  });
  const [overlay, setOverlay] = useState<Overlay>(null);

  const skills = useProgress((s) => s.skills);
  const reviewCount = useMemo(() => dueLessons().length, [skills]);
  const voice = useNaturalVoiceStatus();

  // Children who use read-aloud get the natural voice warmed up straight away.
  useEffect(() => {
    if (getSettings().autoRead) prepareVoice();
  }, []);

  const go = useCallback((next: Screen) => {
    stopSpeaking();
    setScreen(next);
    window.scrollTo(0, 0);
  }, []);

  const openLesson = useCallback(
    (id: string) => {
      if (!findLesson(id)) return;
      play('whoosh');
      update((s) => ({ ...s, lessonId: id }));
      go({ name: 'lesson', id });
    },
    [go],
  );

  const actions: TopBarActions = {
    onReview: () => setOverlay('review'),
    onStickers: () => setOverlay('stickers'),
    onSettings: () => setOverlay('settings'),
    onAge: () => setOverlay('age'),
    reviewCount,
  };
  const home = () => go({ name: 'home' });

  let title = 'Wonder Why Lab';
  let body;
  if (screen.name === 'lesson') {
    const hit = findLesson(screen.id)!;
    title = `${hit.lesson.title} · Wonder Why Lab`;
    const subject = hit.module.subject;
    body = (
      <LessonRoute
        key={screen.id}
        id={screen.id}
        compact={compact}
        topBar={
          <TopBar
            back={{ label: SUBJECT_NAMES[subject], onClick: () => go({ name: 'subject', subject }) }}
            onHome={home}
            center={<LessonSwitcher module={hit.module} activeId={screen.id} onPick={openLesson} onAll={() => go({ name: 'subject', subject })} />}
            actions={actions}
          />
        }
        onNext={openLesson}
        onDone={() => go({ name: 'subject', subject })}
      />
    );
  } else if (screen.name === 'story') {
    const story = findStory(screen.id)!;
    title = `${story.title} · Wonder Why Lab`;
    body = (
      <>
        <TopBar back={{ label: 'Stories', onClick: () => go({ name: 'stories' }) }} onHome={home} center={<span className="top-title">{story.title}</span>} actions={actions} />
        <main className="page">
          <StoryReader key={story.id} story={story} onDone={() => go({ name: 'stories' })} />
        </main>
      </>
    );
  } else if (screen.name === 'game') {
    const game = findGame(screen.id)!;
    title = `${game.title} · Wonder Why Lab`;
    body = (
      <>
        <TopBar back={{ label: 'Back', onClick: () => go(screen.back) }} onHome={home} center={<span className="top-title">{game.title}</span>} actions={actions} />
        <main className="page game-page">
          <GameShell key={`${game.id}-${age}`} game={game} band={age} onExit={() => go(screen.back)} />
        </main>
      </>
    );
  } else {
    const isHome = screen.name === 'home';
    const label = screen.name === 'subject' ? SUBJECT_NAMES[screen.subject] : screen.name === 'games' ? 'Games' : screen.name === 'stories' ? 'Stories' : '';
    if (!isHome) title = `${label} · Wonder Why Lab`;
    body = (
      <>
        <TopBar back={isHome ? undefined : { label: 'Home', onClick: home }} actions={actions} />
        <main className="page">
          {screen.name === 'home' && (
            <Home
              onSubject={(subject) => go({ name: 'subject', subject })}
              onGames={() => go({ name: 'games' })}
              onStories={() => go({ name: 'stories' })}
              onReview={() => setOverlay('review')}
              onLesson={openLesson}
              reviewCount={reviewCount}
            />
          )}
          {screen.name === 'subject' && (
            <SubjectPage
              key={`${screen.subject}-${age}`}
              subject={screen.subject}
              band={age}
              onLesson={openLesson}
              onGame={(id) => go({ name: 'game', id, back: screen })}
            />
          )}
          {screen.name === 'games' && <GamesHub band={age} onGame={(id) => go({ name: 'game', id, back: screen })} />}
          {screen.name === 'stories' && <StoryShelf key={age} band={age} onOpen={(id) => go({ name: 'story', id })} />}
        </main>
      </>
    );
  }

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className={`app${compact ? ' compact' : ''} screen-${screen.name}`} data-age={age}>
      {body}

      {voice.state === 'loading' && (
        <div className="voice-pill" role="status">
          <span className="voice-pill-bar" style={{ width: `${Math.round(voice.progress * 100)}%` }} />
          Getting the reading voice ready… {Math.round(voice.progress * 100)}%
        </div>
      )}
      {(band === null || overlay === 'age') && <AgePicker firstRun={band === null} onDone={() => setOverlay(null)} />}
      {overlay === 'review' && <Review onClose={() => setOverlay(null)} />}
      {overlay === 'stickers' && <Stickers onClose={() => setOverlay(null)} />}
      {overlay === 'settings' && <SettingsModal onClose={() => setOverlay(null)} />}
      <BrainBreak />
    </div>
  );
}

/** A lesson's code loads with its module the first time; the top bar is there straight away. */
function LessonRoute({ id, ...rest }: { id: string } & Omit<Parameters<typeof LessonScreen>[0], 'lesson' | 'module'>) {
  const hit = findLesson(id)!;
  const { module, failed, retry } = useModule(hit.module.id);
  if (!module) {
    return (
      <>
        {rest.topBar}
        <main className="page">
          <Loading failed={failed} onRetry={retry} what="lesson" />
        </main>
      </>
    );
  }
  return <LessonScreen lesson={module.lessons[hit.index]} module={module} {...rest} />;
}

/** The playground plus the practice panel. */
function LessonScreen({
  lesson,
  module,
  compact,
  topBar,
  onNext,
  onDone,
}: {
  lesson: Lesson;
  module: Module;
  compact: boolean;
  topBar: ReactNode;
  onNext: (id: string) => void;
  onDone: () => void;
}) {
  const name = useProgress((s) => s.name);
  const [round, setRound] = useState(0);
  const index = module.lessons.indexOf(lesson);
  const nextLesson = module.lessons[index + 1];
  const next = useCallback((level: number) => lesson.makeQuestion(level), [lesson]);
  const onFinish = useCallback(({ stars }: { stars: number }) => recordLesson(lesson.id, stars), [lesson.id]);
  const onAnswer = useCallback(
    ({ firstTry, level }: { firstTry: boolean; level: number }) => recordPractice(lesson.id, firstTry, level),
    [lesson.id],
  );
  // Resume at the difficulty this child reached last time.
  const [startLevel] = useState(() => getState().skills[lesson.id]?.level ?? 0);
  const { Scene } = lesson;

  return (
    <>
      {topBar}
      <main className="lesson-main">
        <Stage insets={compact ? COMPACT_INSETS : DESKTOP_INSETS} toolbarBottom={18} compact={compact}>
          <Scene />
        </Stage>
        <div className="panels">
          <LessonPanel
            lesson={lesson}
            practice={
              <TryIt
                key={round}
                goal={GOAL}
                next={next}
                startLevel={startLevel}
                onAnswer={onAnswer}
                onFinish={onFinish}
                renderDone={({ stars, comebacks }, restart) => (
                  <div className="done-card">
                    <StarRow stars={stars} />
                    <h4>{stars === 3 ? 'Every one first time!' : 'Lesson complete!'}</h4>
                    <p>
                      {name ? `Well done, ${name}! ` : 'Well done! '}
                      {comebacks > 0
                        ? `You fixed ${comebacks} tricky ${comebacks === 1 ? 'one' : 'ones'} by not giving up.`
                        : 'Your careful thinking paid off.'}
                    </p>
                    <p className="talk-prompt">
                      <MessageCircle size={16} /> Tell a grown-up how you worked out one of the answers.
                    </p>
                    <p className="review-note">We’ll bring this back for a quick review tomorrow to help it stick.</p>
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          restart();
                          setRound((r) => r + 1);
                        }}
                      >
                        <RotateCcw size={16} /> Again
                      </button>
                      {nextLesson ? (
                        <button type="button" className="btn primary" onClick={() => onNext(nextLesson.id)}>
                          Next: {nextLesson.title} <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button type="button" className="btn primary" onClick={onDone}>
                          All lessons <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              />
            }
          />
        </div>
      </main>
    </>
  );
}
