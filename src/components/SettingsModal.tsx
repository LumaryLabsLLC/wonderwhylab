import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { NATURAL_VOICES, naturalVoiceSupported, useNaturalVoiceStatus } from '../lib/natural-voice';
import { canSpeak, currentVoice, naturalChoice, prepareVoice, speak, useVoices, voiceId } from '../lib/speech';
import { resetProgress, setSetting, update, useProgress } from '../lib/progress';
import { AGES } from '../lib/ages';
import { Modal } from './Modal';

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => onChange(!on)} />;
}

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

/** "Karen (English (Australia))" → "Karen · Australia" */
function voiceLabel(v: SpeechSynthesisVoice) {
  const name = v.name.replace(/\s*\(.*\)\s*$/, '');
  const region = v.lang.split(/[-_]/)[1];
  const where = region ? regionNames?.of(region.toUpperCase()) ?? region : '';
  return where ? `${name} · ${where}` : name;
}

const SAMPLE = 'Hi! I can read the questions to you. What is 3 plus 4?';

const RATES = [
  { label: 'Slow', value: 0.7 },
  { label: 'Normal', value: 0.9 },
  { label: 'Fast', value: 1.1 },
];

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useProgress((s) => s.settings);
  const name = useProgress((s) => s.name);
  const band = useProgress((s) => s.band);
  const [confirming, setConfirming] = useState(false);
  const voices = useVoices();
  const active = currentVoice();
  const natural = naturalVoiceSupported();
  const voiceStatus = useNaturalVoiceStatus();
  const usingNatural = naturalChoice(settings.voice) !== null;
  // Auto is the natural voice on a computer and the device's own voice on a phone or tablet.
  const autoNatural = naturalChoice('') !== null;
  const autoLabel = autoNatural ? 'Auto · Heart' : active ? `Auto · ${active.name.replace(/\s*\(.*\)\s*$/, '')}` : 'Auto';

  return (
    <Modal title="Settings" subtitle="Saved on this device only." onClose={onClose} narrow>
      <div className="settings">
        <label className="setting">
          <span>
            <span className="t">Your name</span>
            <span className="d" style={{ display: 'block' }}>
              So we can cheer for you.
            </span>
          </span>
          <input
            className="text-input"
            value={name}
            maxLength={20}
            placeholder="Type your name"
            onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
          />
        </label>
        <div className="setting">
          <span>
            <span className="t">Age</span>
            <span className="d" style={{ display: 'block' }}>
              Changes the lessons, games and colours.
            </span>
          </span>
          <div className="seg" role="group" aria-label="Age">
            {AGES.map((a) => (
              <button key={a.band} type="button" aria-pressed={band === a.band} onClick={() => update((s) => ({ ...s, band: a.band }))}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div className="setting">
          <span>
            <span className="t">Sounds</span>
            <span className="d" style={{ display: 'block' }}>
              Happy beeps for taps and answers.
            </span>
          </span>
          <Switch on={settings.effects} onChange={(v) => setSetting('effects', v)} label="Sounds" />
        </div>
        {canSpeak() && (
          <>
            <div className="setting">
              <span>
                <span className="t">Read questions aloud</span>
                <span className="d" style={{ display: 'block' }}>
                  Great for children who are learning to read.
                </span>
              </span>
              <Switch
                on={settings.autoRead}
                onChange={(v) => {
                  setSetting('autoRead', v);
                  if (v) prepareVoice();
                }}
                label="Read questions aloud"
              />
            </div>
            <div className="setting">
              <span>
                <span className="t">Voice</span>
                <span className="d" style={{ display: 'block' }}>
                  {usingNatural && voiceStatus.state === 'loading'
                    ? `Downloading the natural voice… ${Math.round(voiceStatus.progress * 100)}% (one time only)`
                    : usingNatural && voiceStatus.state === 'ready'
                      ? 'Natural voice ready.'
                      : natural && voiceStatus.state === 'error'
                        ? 'The natural voice could not load, so we use the device voice.'
                        : 'Pick who reads to you.'}
                </span>
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  className="text-input select"
                  value={settings.voice}
                  aria-label="Read-aloud voice"
                  onChange={(e) => {
                    setSetting('voice', e.target.value);
                    speak(SAMPLE, { force: true, preview: true });
                  }}
                >
                  <option value="">{autoLabel}</option>
                  {natural && (
                    <optgroup label={autoNatural ? 'Natural voices' : 'Natural voices (110 MB download)'}>
                      {NATURAL_VOICES.map((v) => (
                        <option key={v.id} value={`natural:${v.id}`}>
                          {v.name} · {v.accent}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {voices.length > 0 && (
                    <optgroup label="Built-in voices">
                      {voices.map((v) => (
                        <option key={voiceId(v)} value={`device:${voiceId(v)}`}>
                          {voiceLabel(v)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button type="button" className="icon-btn solid" onClick={() => speak(SAMPLE, { force: true, preview: true })} aria-label="Hear this voice" title="Hear this voice">
                  <Play size={16} />
                </button>
              </div>
            </div>
            <div className="setting">
              <span>
                <span className="t">Talking speed</span>
              </span>
              <div className="seg" role="group" aria-label="Talking speed">
                {RATES.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    aria-pressed={settings.rate === r.value}
                    onClick={() => {
                      setSetting('rate', r.value);
                      speak(SAMPLE, { force: true, preview: true });
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="setting">
          <span>
            <span className="t">Relaxed games</span>
            <span className="d" style={{ display: 'block' }}>
              No countdown timers, so there’s time to think.
            </span>
          </span>
          <Switch on={settings.relaxedGames} onChange={(v) => setSetting('relaxedGames', v)} label="Relaxed games" />
        </div>
        <div className="setting">
          <span>
            <span className="t">Brain breaks</span>
            <span className="d" style={{ display: 'block' }}>
              Suggest a quick movement break every 15 minutes.
            </span>
          </span>
          <Switch on={settings.breaks} onChange={(v) => setSetting('breaks', v)} label="Brain breaks" />
        </div>
        <div className="setting">
          <span>
            <span className="t">Labels on the playground</span>
            <span className="d" style={{ display: 'block' }}>
              Show the explaining cards around each toy.
            </span>
          </span>
          <Switch on={settings.showLabels} onChange={(v) => setSetting('showLabels', v)} label="Labels" />
        </div>
        <div className="setting">
          <span>
            <span className="t">Start over</span>
            <span className="d" style={{ display: 'block' }}>
              Clears stars, stickers and your name.
            </span>
          </span>
          {confirming ? (
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setConfirming(false)}>
                Keep
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  resetProgress();
                  setConfirming(false);
                  onClose();
                }}
              >
                Erase
              </button>
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setConfirming(true)}>
              <RotateCcw size={16} /> Reset
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
