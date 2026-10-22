import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Play, RotateCcw, Trophy, Volume2 } from 'lucide-react';
import { GAMES, useGame } from '../games';
import type { Band, GameInfo } from '../games/types';
import { ageOf } from '../lib/ages';
import { confetti } from '../lib/confetti';
import { recordGame, useProgress } from '../lib/progress';
import { play } from '../lib/sound';
import { speak, stopSpeaking } from '../lib/speech';

const SHELVES = [
  { subject: 'math', title: 'Math games' },
  { subject: 'reading', title: 'Reading games' },
  { subject: 'science', title: 'Science games' },
] as const;

const TOPIC_LABEL = { physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology' } as const;

/** Small "Physics" / "Chemistry" / "Biology" label for science game cards. */
export function TopicTag({ game }: { game: GameInfo }) {
  return game.topic ? <span className={`topic-tag ${game.topic}`}>{TOPIC_LABEL[game.topic]}</span> : null;
}

/** Every game, in math and reading shelves, pitched at the child's age. */
export function GamesHub({ band, onGame }: { band: Band; onGame: (id: string) => void }) {
  const best = useProgress((s) => s.gameBest);
  return (
    <div className="subject">
      <div className="subject-head">
        <h1>Games</h1>
      </div>
      {SHELVES.map((shelf) => (
        <section key={shelf.subject} aria-label={shelf.title}>
          <h2 className="shelf-title">{shelf.title}</h2>
          <div className="game-shelf">
            {GAMES.filter((g) => (g.subject ?? 'math') === shelf.subject).map((g) => {
              const Icon = g.icon;
              const top = best[`${g.id}:${band}`];
              return (
                <button key={g.id} type="button" className="game-card" style={{ '--c': g.color } as CSSProperties} onClick={() => onGame(g.id)}>
                  <span className="game-icon">
                    <Icon size={30} strokeWidth={2} />
                  </span>
                  <span className="game-title">{g.title}</span>
                  <span className="game-blurb">{g.blurb}</span>
                  <TopicTag game={g} />
                  {top !== undefined && (
                    <span className="game-best">
                      <Trophy size={13} /> Best {top}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

type Phase = 'intro' | 'playing' | 'done';

export function GameShell({ game, band, onExit }: { game: GameInfo; band: Band; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const best = useProgress((s) => s.gameBest[`${game.id}:${band}`]);
  const relaxed = useProgress((s) => s.settings.relaxedGames);
  const instructions = game.howToByBand?.[band] ?? game.howTo;

  useEffect(() => () => stopSpeaking(), []);
  const Icon = game.icon;
  // The gameplay downloads while the child reads the start screen.
  const code = useGame(game.id);
  const Gameplay = code.game?.Play;

  const start = () => {
    stopSpeaking();
    play('pop');
    setRound((r) => r + 1);
    setPhase('playing');
  };

  const finish = (points: number) => {
    const isBest = best === undefined || points > best;
    recordGame(game.id, band, points);
    setScore(points);
    setNewBest(isBest && points > 0);
    setPhase('done');
    play('complete');
    if (isBest && points > 0) confetti();
    speak(isBest && points > 0 ? `New best! ${points} ${game.scoreLabel}!` : `You got ${points} ${game.scoreLabel}. Well played!`);
  };

  if (phase === 'playing') {
    return (
      <div className="game-area" style={{ '--c': game.color } as CSSProperties}>
        <details className="game-help">
          <summary>How to play</summary>
          <p>{instructions}</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => speak(instructions, { force: true })} aria-label="Hear the game instructions">
              <Volume2 size={17} /> Hear it
            </button>
            <button type="button" className="btn" onClick={start}>
              <RotateCcw size={17} /> Start again
            </button>
          </div>
        </details>
        {Gameplay ? (
          <Gameplay key={round} band={band} relaxed={relaxed} onFinish={finish} />
        ) : (
          <Loading failed={code.failed} onRetry={code.retry} what="game" />
        )}
      </div>
    );
  }

  return (
    <div className="game-panel" style={{ '--c': game.color } as CSSProperties}>
      <span className="game-icon big">
        <Icon size={54} strokeWidth={1.8} />
      </span>
      {phase === 'intro' ? (
        <>
          <h3>{game.title}</h3>
          <p>{instructions}</p>
          <p className="game-ages">For ages {ageOf(band).label}</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => speak(instructions, { force: true })}>
              <Volume2 size={18} /> Hear it
            </button>
            <button type="button" className="btn primary big" onClick={start} data-autofocus>
              <Play size={20} /> Play
            </button>
          </div>
        </>
      ) : (
        <>
          <h3>{newBest ? 'New best score!' : 'Nice playing!'}</h3>
          <div className="score-big">{score}</div>
          <p>{game.scoreLabel}</p>
          {!newBest && best !== undefined && (
            <p className="game-ages">
              <Trophy size={14} /> Best: {best}
            </p>
          )}
          <div className="btn-row">
            <button type="button" className="btn" onClick={onExit}>
              More games
            </button>
            <button type="button" className="btn primary big" onClick={start}>
              <RotateCcw size={18} /> Play again
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Shown while a lesson's or game's code downloads (usually only a moment), or if it couldn't. */
export function Loading({ failed, onRetry, what }: { failed: boolean; onRetry: () => void; what: string }) {
  return (
    <div className="loading" role="status">
      {failed ? (
        <>
          <p>This {what} couldn’t load. Check the internet connection and try again.</p>
          <button type="button" className="btn primary" onClick={onRetry}>
            Try again
          </button>
        </>
      ) : (
        <p className="loading-dots">
          Getting the {what} ready<span>.</span>
          <span>.</span>
          <span>.</span>
        </p>
      )}
    </div>
  );
}
