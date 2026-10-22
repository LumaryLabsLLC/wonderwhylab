import { useState } from 'react';
import type { CSSProperties } from 'react';
import { AGES } from '../lib/ages';
import { update, useProgress } from '../lib/progress';
import { Logo } from './Brand';
import { Modal } from './Modal';

/**
 * "Who's learning?" — picking an age sets the lessons, the games' difficulty and the whole look.
 * Shown on first visit (can't be skipped) and from the age chip in the top bar.
 */
export function AgePicker({ firstRun, onDone }: { firstRun: boolean; onDone: () => void }) {
  const savedName = useProgress((s) => s.name);
  const current = useProgress((s) => s.band);
  const [name, setName] = useState(savedName);
  return (
    <Modal title={firstRun ? 'Welcome to Wonder Why Lab!' : 'Who’s learning?'} onClose={onDone} narrow dismissable={!firstRun}>
      <div className="welcome">
        {firstRun && <Logo className="welcome-logo" />}
        <p>Pick an age and everything changes to fit: the lessons, the games and even the colours.</p>
        <label className="welcome-name">
          <span>My name is</span>
          <input className="text-input" value={name} maxLength={20} placeholder="(optional)" onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="age-grid">
          {AGES.map((a) => (
            <button
              key={a.band}
              type="button"
              className={`age-btn${current === a.band ? ' current' : ''}`}
              style={{ '--c': a.color, '--c-soft': a.soft } as CSSProperties}
              onClick={() => {
                update((s) => ({ ...s, band: a.band, name: name.trim() }));
                onDone();
              }}
            >
              <span className="age">{a.label}</span>
              <span className="mod">{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
