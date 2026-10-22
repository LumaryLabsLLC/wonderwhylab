import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck, Repeat, Sparkles } from 'lucide-react';
import { ALL_LESSONS, loadedLesson, loadLessons } from '../lessons';
import type { LessonInfo } from '../lessons/types';
import { INTERVAL_DAYS, interleave, isDue } from '../lib/memory';
import { getState, recordPractice, recordReview, useProgress } from '../lib/progress';
import { shuffle } from '../lib/random';
import { Loading } from './Games';
import { Modal } from './Modal';
import { TryIt } from './TryIt';

/** Most lessons in one review, so a session stays short (about 5 minutes). */
const MAX_LESSONS = 5;
const PER_LESSON = 2;

export function dueLessons(now = Date.now()): LessonInfo[] {
  const { skills } = getState();
  return ALL_LESSONS.filter((l) => isDue(skills[l.id], now)).sort((a, b) => skills[a.id].due - skills[b.id].due);
}

/**
 * Spaced, interleaved review of earlier lessons: retrieval practice at growing gaps
 * (Dunlosky et al., 2013) with problem types mixed together (Rohrer et al.).
 */
export function Review({ onClose }: { onClose: () => void }) {
  const skills = useProgress((s) => s.skills);
  const [now] = useState(() => Date.now());
  const due = useMemo(() => dueLessons(now).slice(0, MAX_LESSONS), [now]);
  const started = ALL_LESSONS.filter((l) => (skills[l.id]?.box ?? 0) >= 1);
  const [session, setSession] = useState<{ kind: 'due' | 'mix'; lessons: LessonInfo[]; round: number } | null>(
    due.length ? { kind: 'due', lessons: due, round: 0 } : null,
  );
  const [summary, setSummary] = useState<{ lesson: LessonInfo; allRight: boolean }[] | null>(null);

  // The questions come from the lessons' own code, so load those lessons before the first one.
  const [readyFor, setReadyFor] = useState<typeof session>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!session) return;
    let live = true;
    setLoadFailed(false);
    loadLessons(session.lessons.map((l) => l.id)).then(
      () => live && setReadyFor(session),
      () => live && setLoadFailed(true),
    );
    return () => {
      live = false;
    };
  }, [session, attempt]);

  const order = useMemo(() => (session ? interleave(session.lessons.map((l) => l.id), PER_LESSON) : []), [session]);
  const current = useRef('');
  const results = useRef<Record<string, boolean>>({});

  const next = useCallback(
    (_level: number, index: number) => {
      const id = order[Math.min(index, order.length - 1)];
      current.current = id;
      return loadedLesson(id)!.makeQuestion(getState().skills[id]?.level ?? 1);
    },
    [order],
  );

  const onAnswer = useCallback(({ firstTry }: { firstTry: boolean }) => {
    const id = current.current;
    results.current[id] = (results.current[id] ?? true) && firstTry;
    recordPractice(id, firstTry, getState().skills[id]?.level ?? 1);
  }, []);

  const onFinish = useCallback(() => {
    if (!session) return;
    if (session.kind === 'due') recordReview(results.current);
    setSummary(session.lessons.map((lesson) => ({ lesson, allRight: results.current[lesson.id] ?? true })));
  }, [session]);

  const startMix = () => {
    results.current = {};
    setSummary(null);
    setSession({ kind: 'mix', lessons: shuffle(started).slice(0, 4), round: (session?.round ?? 0) + 1 });
  };

  const nextDue = started.map((l) => skills[l.id].due).sort((a, b) => a - b)[0];

  return (
    <Modal title="Review" subtitle="A quick mix of earlier lessons. Coming back to them helps them stick." onClose={onClose} narrow>
      {!session ? (
        <div className="review-empty">
          {started.length === 0 ? (
            <>
              <Repeat size={40} />
              <h3>Nothing to review yet</h3>
              <p>Finish a lesson and it will come back here tomorrow for a quick review.</p>
              <button type="button" className="btn primary" onClick={onClose}>
                Back to learning
              </button>
            </>
          ) : (
            <>
              <CalendarCheck size={40} />
              <h3>All caught up!</h3>
              <p>{nextDue ? `Your next review is ${describeWhen(nextDue, now)}.` : 'Nothing is due right now.'}</p>
              <button type="button" className="btn primary" onClick={startMix}>
                <Sparkles size={16} /> Mixed warm-up anyway
              </button>
            </>
          )}
        </div>
      ) : readyFor !== session ? (
        <Loading failed={loadFailed} onRetry={() => setAttempt((a) => a + 1)} what="review" />
      ) : (
        <TryIt
          key={`${session.kind}-${session.round}`}
          title="Review"
          goal={order.length}
          next={next}
          onAnswer={onAnswer}
          onFinish={onFinish}
          renderDone={() => (
            <div className="done-card">
              <h4>Review done!</h4>
              <p>Every time you remember something, your memory of it gets stronger.</p>
              <ul className="review-summary">
                {summary?.map(({ lesson, allRight }) => (
                  <li key={lesson.id}>
                    <span>{lesson.title}</span>
                    <span className="sub">
                      {session.kind === 'mix'
                        ? allRight
                          ? 'Nice and solid'
                          : 'Worth another look'
                        : allRight
                          ? `Next review in ${INTERVAL_DAYS[Math.min(5, (getState().skills[lesson.id]?.box ?? 1))]} days`
                          : 'Back tomorrow for another go'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="btn-row">
                <button type="button" className="btn primary" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        />
      )}
    </Modal>
  );
}

function describeWhen(due: number, now: number): string {
  const days = Math.max(0, Math.round((due - now) / (24 * 60 * 60 * 1000)));
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
