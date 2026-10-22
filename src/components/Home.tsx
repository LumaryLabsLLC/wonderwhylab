import type { CSSProperties } from 'react';
import { ArrowRight, Repeat } from 'lucide-react';
import { GAMES } from '../games';
import { ALL_LESSONS, findLesson, moduleFor } from '../lessons';
import { STORIES, storiesFor } from '../stories';
import { ageOf } from '../lib/ages';
import { masteryOf } from '../lib/memory';
import { useProgress } from '../lib/progress';
import { HOME_TILES } from '../subjects';
import { LessonThumb } from './LessonThumb';
import type { HomeTileId, SubjectId } from '../subjects';

export type { SubjectId };

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** The first screen: a few big, clear choices instead of a busy dashboard. */
export function Home({
  onSubject,
  onGames,
  onStories,
  onReview,
  onLesson,
  reviewCount,
}: {
  onSubject: (s: SubjectId) => void;
  onGames: () => void;
  onStories: () => void;
  onReview: () => void;
  onLesson: (id: string) => void;
  reviewCount: number;
}) {
  const name = useProgress((s) => s.name);
  const band = useProgress((s) => s.band) ?? 0;
  const skills = useProgress((s) => s.skills);
  const lastId = useProgress((s) => s.lessonId);
  const last = findLesson(lastId);
  const age = ageOf(band).label;

  /** Tile counts are for the chosen age, and say so. */
  const subtitle = (id: HomeTileId) => {
    if (id === 'games') return `${GAMES.length} games to play`;
    if (id === 'stories') {
      const n = storiesFor(band).length;
      return n ? `${plural(n, 'story', 'stories')} for ages ${age}` : 'Coming soon';
    }
    const m = moduleFor(id, band);
    const games = GAMES.filter((g) => (g.subject ?? 'math') === id).length;
    if (!m.lessons.length) return games ? plural(games, 'game') : 'Coming soon';
    const mastered = m.lessons.filter((l) => masteryOf(skills[l.id]) === 'mastered').length;
    const parts = [`${plural(m.lessons.length, 'lesson')} for ages ${age}`];
    if (games) parts.push(plural(games, 'game'));
    if (mastered) parts.push(`${mastered} mastered`);
    return parts.join(' · ');
  };
  const progress = (id: HomeTileId) => {
    if (id === 'games' || id === 'stories') return null;
    const m = moduleFor(id, band);
    if (!m.lessons.length) return null;
    const started = m.lessons.filter((l) => (skills[l.id]?.box ?? 0) >= 1).length;
    return started / m.lessons.length;
  };
  const open = (id: HomeTileId) => (id === 'games' ? onGames() : id === 'stories' ? onStories() : onSubject(id));

  return (
    <div className="home">
      <h1 className="home-hello">{name ? `Hi ${name}!` : 'Hi there!'} What do you wonder about today?</h1>
      <p className="home-sub">
        Showing ages {age} · {ALL_LESSONS.length} lessons, {STORIES.length} stories and {GAMES.length} games in all
      </p>

      {reviewCount > 0 && (
        <button type="button" className="review-banner" onClick={onReview}>
          <Repeat size={22} />
          <span>
            <strong>
              {reviewCount} {reviewCount === 1 ? 'lesson' : 'lessons'} to review
            </strong>
            <span>A quick mix to help you remember.</span>
          </span>
          <ArrowRight size={20} />
        </button>
      )}

      <div className="tiles">
        {HOME_TILES.map((t) => {
          const Icon = t.icon;
          const p = progress(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className="tile"
              style={{ '--c': t.color, '--c-soft': t.soft } as CSSProperties}
              onClick={() => open(t.id)}
            >
              <span className="tile-icon">
                <Icon size={44} strokeWidth={2} />
              </span>
              <span className="tile-title">{t.title}</span>
              <span className="tile-sub">{subtitle(t.id)}</span>
              {p !== null && (
                <span className="tile-bar" aria-hidden>
                  <span style={{ width: `${Math.round(p * 100)}%` }} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {last && (
        <button type="button" className="continue" onClick={() => onLesson(last.lesson.id)}>
          <span className="continue-thumb">
            <LessonThumb id={last.lesson.id} />
          </span>
          <span className="continue-text">
            <span className="continue-label">Keep going</span>
            <span className="continue-title">{last.lesson.title}</span>
          </span>
          <ArrowRight size={22} />
        </button>
      )}
    </div>
  );
}
