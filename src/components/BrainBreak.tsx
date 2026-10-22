import { useEffect, useRef, useState } from 'react';
import { PersonStanding } from 'lucide-react';
import { pick } from '../lib/random';
import { getSettings } from '../lib/progress';
import { Modal } from './Modal';

/** Minutes of on-screen time before a movement break is suggested. */
const BREAK_AFTER_MIN = 15;

const MOVES = [
  'Stretch up high like a giraffe, then touch your toes.',
  'Do 10 star jumps.',
  'Take 5 slow balloon breaths: in through your nose, out through your mouth.',
  'Wiggle your fingers, then your toes, then everything!',
  'March on the spot and count to 20.',
  'Stand on one foot and count to 10. Now the other foot!',
];

/**
 * Short movement breaks help children get back on task (Mahar et al., 2006 found about 8% more
 * on-task behaviour, and about 20% for the least focused children). Counts only time the app is visible.
 */
export function BrainBreak() {
  const [show, setShow] = useState(false);
  const [move, setMove] = useState(MOVES[0]);
  const active = useRef(0);

  useEffect(() => {
    const tick = 30_000;
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !getSettings().breaks) return;
      active.current += tick;
      if (active.current >= BREAK_AFTER_MIN * 60_000) {
        active.current = 0;
        setMove(pick(MOVES));
        setShow(true);
      }
    }, tick);
    return () => window.clearInterval(t);
  }, []);

  if (!show) return null;
  return (
    <Modal title="Brain break!" onClose={() => setShow(false)} narrow>
      <div className="break-card">
        <PersonStanding size={56} strokeWidth={1.6} />
        <p className="break-move">{move}</p>
        <p className="break-why">Moving your body helps your brain get ready to learn again.</p>
        <button type="button" className="btn primary big" onClick={() => setShow(false)} data-autofocus>
          I’m back!
        </button>
      </div>
    </Modal>
  );
}
