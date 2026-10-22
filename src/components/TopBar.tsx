import type { ReactNode } from 'react';
import { ArrowLeft, House, Repeat, Settings, Star, Trophy } from 'lucide-react';
import { ageOf } from '../lib/ages';
import { useProgress } from '../lib/progress';
import { Brand } from './Brand';

export interface TopBarActions {
  onReview: () => void;
  onStickers: () => void;
  onSettings: () => void;
  onAge: () => void;
  reviewCount: number;
}

/**
 * One simple bar on every screen: home/back on the left, what you're doing in the middle,
 * and the few things a child (or grown-up) needs on the right.
 */
export function TopBar({
  back,
  onHome,
  center,
  actions,
}: {
  /** Shown instead of the logo: e.g. { label: 'Math', onClick }. */
  back?: { label: string; onClick: () => void };
  onHome?: () => void;
  center?: ReactNode;
  actions: TopBarActions;
}) {
  const stars = useProgress((s) => s.stars);
  const band = useProgress((s) => s.band) ?? 0;
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const { onReview, onStickers, onSettings, onAge, reviewCount } = actions;

  return (
    <header className="topbar">
      <div className="topbar-left">
        {back ? (
          <>
            <button type="button" className="top-btn" onClick={back.onClick} aria-label={`Back to ${back.label}`}>
              <ArrowLeft size={22} />
              <span className="top-label">{back.label}</span>
            </button>
            {onHome && (
              <button type="button" className="top-btn icon-only" onClick={onHome} aria-label="Home">
                <House size={20} />
              </button>
            )}
          </>
        ) : (
          <Brand />
        )}
      </div>
      <div className="topbar-center">{center}</div>
      <div className="topbar-right">
        <span className="star-pill" title="Stars collected" aria-label={`${total} stars`}>
          <Star size={18} fill="var(--star)" strokeWidth={2} /> {total}
        </span>
        <button type="button" className="top-btn icon-only" onClick={onReview} aria-label={reviewCount ? `Review, ${reviewCount} due` : 'Review'} title="Review">
          <Repeat size={20} />
          {reviewCount > 0 && <span className="badge">{reviewCount}</span>}
        </button>
        <button type="button" className="top-btn icon-only hide-small" onClick={onStickers} aria-label="Stickers" title="Stickers">
          <Trophy size={20} />
        </button>
        <button type="button" className="age-chip" onClick={onAge} aria-label={`Age ${ageOf(band).label}. Change age`} title="Change age">
          {ageOf(band).label}
        </button>
        <button type="button" className="top-btn icon-only" onClick={onSettings} aria-label="Settings" title="Settings">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}
