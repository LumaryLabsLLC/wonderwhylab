import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ModuleInfo } from '../lessons/types';
import { useProgress } from '../lib/progress';

/** "‹ 3 · Tens & Ones ›" with a dot per lesson — replaces the big lesson strip. */
export function LessonSwitcher({
  module,
  activeId,
  onPick,
  onAll,
}: {
  module: ModuleInfo;
  activeId: string;
  onPick: (id: string) => void;
  onAll: () => void;
}) {
  const stars = useProgress((s) => s.stars);
  const index = module.lessons.findIndex((l) => l.id === activeId);
  const prev = index > 0 ? module.lessons[index - 1] : undefined;
  const next = index >= 0 ? module.lessons[index + 1] : undefined;
  const lesson = module.lessons[index];

  return (
    <nav className="switcher" aria-label="Lessons">
      <button type="button" className="switcher-arrow" onClick={() => prev && onPick(prev.id)} disabled={!prev} aria-label={prev ? `Previous lesson: ${prev.title}` : 'No previous lesson'}>
        <ChevronLeft size={20} />
      </button>
      <button type="button" className="switcher-main" onClick={onAll} title="See all lessons">
        <span className="switcher-title">
          {lesson ? (
            <>
              <span className="switcher-num">{index + 1}</span>
              {lesson.title}
            </>
          ) : (
            'Pick a lesson'
          )}
        </span>
        <span className="switcher-dots" aria-hidden>
          {module.lessons.map((l) => (
            <i key={l.id} className={`${l.id === activeId ? 'on' : ''}${stars[l.id] ? ' done' : ''}`} />
          ))}
        </span>
      </button>
      <button type="button" className="switcher-arrow" onClick={() => next && onPick(next.id)} disabled={!next} aria-label={next ? `Next lesson: ${next.title}` : 'No next lesson'}>
        <ChevronRight size={20} />
      </button>
    </nav>
  );
}
