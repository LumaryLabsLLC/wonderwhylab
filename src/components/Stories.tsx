import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw, Star, Volume2 } from 'lucide-react';
import { storiesFor } from '../stories';
import type { Story } from '../stories/types';
import { AGES } from '../lib/ages';
import { recordLesson, useProgress } from '../lib/progress';
import { play } from '../lib/sound';
import { canSpeak, speak } from '../lib/speech';
import { StarRow, TryIt } from './TryIt';

/** The bookshelf: stories for the child's age first, other ages one tap away. */
export function StoryShelf({ band, onOpen }: { band: number; onOpen: (id: string) => void }) {
  const [viewBand, setViewBand] = useState(band);
  const stars = useProgress((s) => s.stars);
  const list = storiesFor(viewBand);
  return (
    <div className="subject">
      <div className="subject-head">
        <h1>Stories</h1>
        <div className="age-switch" role="group" aria-label="Show stories for age">
          {AGES.map((a) => (
            <button key={a.band} type="button" aria-pressed={viewBand === a.band} onClick={() => setViewBand(a.band)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="soon">New stories for this age are on the way.</p>
      ) : (
        <div className="shelf">
          {list.map((s) => {
            const got = stars[s.id] ?? 0;
            return (
              <button key={s.id} type="button" className="book" onClick={() => onOpen(s.id)}>
                <span className="book-cover" aria-hidden>
                  {s.cover}
                </span>
                <span className="book-title">{s.title}</span>
                <span className="book-blurb">{s.blurb}</span>
                {got > 0 ? (
                  <span className="path-stars" aria-label={`${got} stars`}>
                    {[1, 2, 3].map((n) => (
                      <Star key={n} size={14} strokeWidth={2} fill={n <= got ? 'var(--star)' : 'transparent'} />
                    ))}
                  </span>
                ) : (
                  <span className="book-pages">
                    <BookOpen size={14} /> {s.pages.length} pages
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Read a story page by page. Every word can be tapped to hear it, and the page can be read aloud,
 * but nothing speaks on its own. Comprehension questions follow the last page.
 */
export function StoryReader({ story, onDone }: { story: Story; onDone: () => void }) {
  const [page, setPage] = useState(-1); // -1 = cover (and words to know)
  const [round, setRound] = useState(0);
  const quiz = page >= story.pages.length;
  const next = useCallback((_level: number, index: number) => story.questions[index % story.questions.length], [story]);
  const onFinish = useCallback(({ stars }: { stars: number }) => recordLesson(story.id, stars), [story.id]);
  const go = (p: number) => {
    play('tap');
    setPage(p);
  };

  return (
    <div className={`reader band-${story.band}`}>
      {page === -1 && (
        <div className="reader-cover fade-up">
          <div className="reader-cover-art" aria-hidden>
            {story.cover}
          </div>
          <h1>{story.title}</h1>
          <p className="reader-blurb">{story.blurb}</p>
          {story.focus && <p className="reader-focus">Sounds in this story: {story.focus}</p>}
          {story.words && story.words.length > 0 && (
            <div className="reader-words">
              <h2>Words to know</h2>
              <ul>
                {story.words.map((w) => (
                  <li key={w.word}>
                    <button type="button" className="word-chip" onClick={() => speak(`${w.word}. ${w.meaning}`, { force: true })}>
                      <strong>{w.word}</strong> {w.meaning}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className="btn primary big" onClick={() => go(0)}>
            Start reading <ArrowRight size={20} />
          </button>
        </div>
      )}

      {page >= 0 && !quiz && (
        <div className="reader-page fade-up" key={page}>
          <div className="reader-picture" aria-hidden>
            {story.pages[page].picture}
          </div>
          <p className="reader-text">
            {story.pages[page].text.split(/(\s+)/).map((token, i) =>
              /^\s+$/.test(token) ? (
                token
              ) : (
                <button key={i} type="button" className="reader-word" onClick={() => speak(token.replace(/[^\p{L}\p{N}'’-]/gu, ''), { force: true })}>
                  {token}
                </button>
              ),
            )}
          </p>
          <div className="reader-controls">
            <button type="button" className="btn" onClick={() => go(page - 1)} aria-label="Previous page">
              <ArrowLeft size={20} />
            </button>
            {canSpeak() && (
              <button type="button" className="btn" onClick={() => speak(story.pages[page].text, { force: true })}>
                <Volume2 size={18} /> Read to me
              </button>
            )}
            <span className="reader-count">
              {page + 1} / {story.pages.length}
            </span>
            <button type="button" className="btn primary" onClick={() => go(page + 1)}>
              {page + 1 === story.pages.length ? 'Questions' : 'Next'} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {quiz && (
        <div className="reader-quiz fade-up">
          <h2>What do you remember?</h2>
          <section className="panel reader-quiz-panel">
            <div className="panel-body">
              <TryIt
                key={round}
                title="Story questions"
                goal={story.questions.length}
                next={next}
                onFinish={onFinish}
                renderDone={({ stars }) => (
                  <div className="done-card">
                    <StarRow stars={stars} />
                    <h4>You finished “{story.title}”!</h4>
                    <p>Reading every day makes you a stronger reader.</p>
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setRound((r) => r + 1);
                          setPage(0);
                        }}
                      >
                        <RotateCcw size={16} /> Read again
                      </button>
                      <button type="button" className="btn primary" onClick={onDone}>
                        More stories <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              />
            </div>
          </section>
          <button type="button" className="btn" onClick={() => go(story.pages.length - 1)}>
            <ArrowLeft size={18} /> Back to the story
          </button>
        </div>
      )}
    </div>
  );
}
