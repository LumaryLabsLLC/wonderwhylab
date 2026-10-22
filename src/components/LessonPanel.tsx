import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { CircleCheck, Hand, Volume2 } from 'lucide-react';
import type { Lesson } from '../lessons/types';
import { canSpeak, speak, stopSpeaking } from '../lib/speech';

const TABS = [
  { id: 'practice', label: 'Practice' },
  { id: 'learn', label: 'Learn' },
  { id: 'example', label: 'Example' },
] as const;

type Tab = (typeof TABS)[number]['id'];

function spokenText(lesson: Lesson, tab: Exclude<Tab, 'practice'>): string {
  if (tab === 'learn') {
    return [lesson.learn.heading, lesson.learn.intro, ...lesson.learn.points.map((p) => p.text), ...lesson.steps].join('. ');
  }
  return [lesson.example.question, ...lesson.example.work, lesson.example.answer].join(' ');
}

/**
 * The one panel beside the playground: practice questions, the lesson explained, and a worked example.
 * The parent keys it by lesson id so each new lesson opens on Practice.
 */
export function LessonPanel({ lesson, practice }: { lesson: Lesson; practice: ReactNode }) {
  const [tab, setTab] = useState<Tab>('practice');
  const bodyRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  const changeTab = (next: Tab) => {
    if (next === tab) return;
    stopSpeaking();
    setTab(next);
  };

  const onKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + TABS.length) % TABS.length;
    changeTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const readButton = (which: Exclude<Tab, 'practice'>) =>
    canSpeak() && (
      <button type="button" className="icon-btn" onClick={() => speak(spokenText(lesson, which), { force: true })} aria-label="Read this aloud" title="Read this aloud">
        <Volume2 size={17} />
      </button>
    );

  return (
    <section className="panel lesson-panel" aria-label="Lesson">
      <div className="tabs" role="tablist" onKeyDown={onKey}>
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            className="tab"
            onClick={() => changeTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="panel-body" ref={bodyRef}>
        <div className="playground-help">
          <div className="info-head">
            <h3><Hand size={16} /> Try the playground</h3>
            {canSpeak() && (
              <button type="button" className="icon-btn" aria-label="Hear how to use the playground" onClick={() => speak(`${lesson.sceneHint}. Then try the practice questions. Look at each question’s own picture or numbers to find your answer.`, { force: true })}>
                <Volume2 size={17} />
              </button>
            )}
          </div>
          <p>{lesson.sceneHint}</p>
          {tab === 'practice' && <p className="practice-directions">Answer 5 questions. Use the picture or numbers shown with each question.</p>}
        </div>
        {/* Practice stays mounted so switching tabs never loses progress. */}
        <div role="tabpanel" id="panel-practice" aria-labelledby="tab-practice" hidden={tab !== 'practice'}>
          {practice}
        </div>
        {tab === 'learn' && (
          <div role="tabpanel" id="panel-learn" aria-labelledby="tab-learn" className="fade-up">
            <div className="info-head">
              <h2>{lesson.learn.heading}</h2>
              {readButton('learn')}
            </div>
            <p className="lead">{lesson.learn.intro}</p>
            <ul className="points">
              {lesson.learn.points.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <span className="pi">
                    <Icon size={20} strokeWidth={1.7} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <h3 className="sub-head">How to do it</h3>
            <ol className="steps">
              {lesson.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="try-this">
              <Hand size={18} /> <span>On the playground: {lesson.sceneHint}</span>
            </p>
            <details className="grownups">
              <summary>Tips for grown-ups</summary>
              <ul>
                {lesson.grownups.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
        {tab === 'example' && (
          <div role="tabpanel" id="panel-example" aria-labelledby="tab-example" className="fade-up">
            <div className="info-head">
              <h2>{lesson.example.question}</h2>
              {readButton('example')}
            </div>
            {lesson.example.visual && <div className="example-visual">{lesson.example.visual}</div>}
            <ol className="work">
              {lesson.example.work.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ol>
            <div className="answer">
              <CircleCheck size={20} color="var(--good)" />
              {lesson.example.answer}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
