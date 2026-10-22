import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, Repeat, Sparkles, Star } from 'lucide-react';
import { GAMES } from '../games';
import { TopicTag } from './Games';
import { moduleFor } from '../lessons';
import { AGES } from '../lib/ages';
import { isDue, MASTERY_LABEL, masteryOf } from '../lib/memory';
import { useProgress } from '../lib/progress';
import { SUBJECT_TITLES } from '../subjects';
import { LessonThumb } from './LessonThumb';
import type { SubjectId } from '../subjects';

const TITLES = SUBJECT_TITLES;

/** One subject for one age: the lesson path first, then the matching games. */
export function SubjectPage({
  subject,
  band,
  onLesson,
  onGame,
}: {
  subject: SubjectId;
  band: number;
  onLesson: (id: string) => void;
  onGame: (gameId: string) => void;
}) {
  const [viewBand, setViewBand] = useState(band);
  const skills = useProgress((s) => s.skills);
  const stars = useProgress((s) => s.stars);
  const now = Date.now();
  const module = moduleFor(subject, viewBand);
  const games = GAMES.filter((g) => (g.subject ?? 'math') === subject);
  const nextUp = module?.lessons.find((l) => (skills[l.id]?.box ?? 0) < 1);

  return (
    <div className="subject">
      <div className="subject-head">
        <h1>{TITLES[subject]}</h1>
        {module && (
          <div className="age-switch" role="group" aria-label="Show lessons for age">
            {AGES.map((a) => (
              <button key={a.band} type="button" aria-pressed={viewBand === a.band} onClick={() => setViewBand(a.band)}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {module && (
        <section aria-label="Lessons">
          {module.lessons.length === 0 ? (
            <p className="soon">New {TITLES[subject].toLowerCase()} lessons for this age are on the way.</p>
          ) : (
            <ol className="path">
              {module.lessons.map((l, i) => {
                const stage = masteryOf(skills[l.id]);
                const due = isDue(skills[l.id], now);
                const isNext = l.id === nextUp?.id;
                const got = stars[l.id] ?? 0;
                return (
                  <li key={l.id}>
                    <button type="button" className={`path-card ${stage}${isNext ? ' next' : ''}`} onClick={() => onLesson(l.id)}>
                      <span className="path-num">{stage === 'mastered' ? <Check size={18} strokeWidth={3} /> : i + 1}</span>
                      <span className="path-thumb">
                        <LessonThumb id={l.id} />
                      </span>
                      <span className="path-title">{l.title}</span>
                      <span className="path-status">
                        {isNext ? (
                          <>
                            <Sparkles size={14} /> Start here
                          </>
                        ) : due ? (
                          <>
                            <Repeat size={14} /> Review due
                          </>
                        ) : got > 0 ? (
                          <span className="path-stars" aria-label={`${got} stars, ${MASTERY_LABEL[stage]}`}>
                            {[1, 2, 3].map((n) => (
                              <Star key={n} size={14} strokeWidth={2} fill={n <= got ? 'var(--star)' : 'transparent'} />
                            ))}
                            <span>{MASTERY_LABEL[stage]}</span>
                          </span>
                        ) : (
                          MASTERY_LABEL[stage]
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}

      {games.length > 0 && (
        <section aria-label={`${TITLES[subject]} games`}>
          <h2 className="shelf-title">{subject === 'reading' ? 'Reading games' : 'Games'}</h2>
          <div className="game-shelf">
            {games.map((g) => {
              const Icon = g.icon;
              return (
                <button key={g.id} type="button" className="game-card" style={{ '--c': g.color } as CSSProperties} onClick={() => onGame(g.id)}>
                  <span className="game-icon">
                    <Icon size={30} strokeWidth={2} />
                  </span>
                  <span className="game-title">{g.title}</span>
                  <span className="game-blurb">{g.blurb}</span>
                  <TopicTag game={g} />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
