import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, Rocket, Star, Volume2 } from 'lucide-react';
import type { Band, Game, GameProps } from '../types';
import { C } from '../../lib/color';
import { play } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { clamp, toSvgPoint } from '../../lib/svg';
import {
  ANGLE_MAX,
  ANGLE_MIN,
  MAX_TRIES,
  PLANETS,
  ROUNDS,
  V_MAX,
  earthRange,
  explain,
  flightPath,
  makeRounds,
  missTip,
  peakOf,
  positionAt,
  shoot,
} from './physics';
import type { PlanetId, Shot } from './physics';
import './launch-lab.css';

const GOALS: Record<Band, string> = {
  0: 'Launch the ball into the basket!',
  1: 'Fly over the wall into the basket!',
  2: 'Aim and launch into the basket!',
  3: 'Land it in the basket, on other worlds too!',
};

const HOW: Record<Band, string> = {
  0: 'Pull back and let go to launch.',
  1: 'Pull back and let go to launch.',
  2: 'Turn the yellow knob to aim. Pull back and let go to launch.',
  3: 'Turn the yellow knob to aim. Pull back and let go to launch.',
};

const SKY: Record<PlanetId, { sky: [string, string]; ground: string; dark: boolean }> = {
  earth: { sky: ['#d9ecff', '#f4f9ff'], ground: '#8fd18a', dark: false },
  mars: { sky: ['#f7d3bc', '#fdeee4'], ground: '#d9774b', dark: false },
  moon: { sky: ['#1d2340', '#39406a'], ground: '#b9bcc8', dark: true },
};

const BARREL = 46;
const KNOB_AT = BARREL + 28;
const TRAIL_N = 48;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A tidy ruler step (1, 2, 5, 10, 20, …) giving about six marks across the field. */
function niceStep(width: number) {
  const raw = width / 6;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
}

type Phase = 'aim' | 'flying' | 'done';

function Play({ band, onFinish }: GameProps) {
  const rounds = useMemo(() => makeRounds(band), [band]);
  const [index, setIndex] = useState(0);
  const round = rounds[index];
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(0);
  const [lastPower, setLastPower] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('aim');
  const [tries, setTries] = useState(0);
  const [score, setScore] = useState(0);
  const [shot, setShot] = useState<Shot | null>(null);
  const [prevShot, setPrevShot] = useState<Shot | null>(null);
  const [simT, setSimT] = useState(0);
  const [hit, setHit] = useState(false);
  const [msg, setMsg] = useState('');
  const [pull, setPull] = useState<{ mode: 'pull' | 'angle'; sx: number; sy: number; x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const raf = useRef(0);
  const finished = useRef(false);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const aim = round.freeAngle ? angle : 45;
  const { w, h } = size;
  const top = w < 560 && band === 3 ? 100 : 64;
  const bottomPad = clamp(h * 0.12, 44, 64);
  const padL = clamp(w * 0.08, 48, 90);
  const padR = 22;
  const maxH = peakOf(V_MAX, round.freeAngle ? ANGLE_MAX : 45, round.g);
  const s = Math.max(0.1, Math.min((w - padL - padR) / round.width, (h - bottomPad - top) / maxH));
  const groundY = Math.min(h - bottomPad, top + maxH * s * 1.45 + 40);
  const X = (m: number) => padL + m * s;
  const Y = (m: number) => groundY - m * s;
  const maxPull = clamp(Math.min(w, h) * 0.38, 110, 220);
  const look = SKY[round.planet];

  const rad = (aim * Math.PI) / 180;
  const dir = { x: Math.cos(rad), y: -Math.sin(rad) };
  // The launcher grows a little on big screens.
  const u = clamp(Math.min(w, h) / 560, 0.85, 1.3);
  const knobR = KNOB_AT * u;
  const knob = { x: padL + dir.x * knobR, y: groundY + dir.y * knobR };
  const arcPt = (deg: number) => `${padL + knobR * Math.cos((deg * Math.PI) / 180)} ${groundY - knobR * Math.sin((deg * Math.PI) / 180)}`;

  const fire = (p: number) => {
    if (phase !== 'aim') return;
    const sh = shoot(round, p, aim);
    cancelAnimationFrame(raf.current);
    setPrevShot(shot);
    setShot(sh);
    setLastPower(p);
    setPhase('flying');
    setMsg('');
    play('whoosh');
    const realDur = clamp(sh.time, 1.2, 2.6) * 1000;
    const land = () => {
      setSimT(sh.time);
      const used = tries + 1;
      setTries(used);
      if (sh.hit) {
        setHit(true);
        setScore((n) => n + 1);
        setPhase('done');
        play('correct');
      } else if (used >= MAX_TRIES) {
        setPhase('done');
        play('wrong');
      } else {
        setMsg(missTip(round, sh));
        setPhase('aim');
        play('tap');
      }
    };
    if (reducedMotion()) {
      land();
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const k = (now - start) / realDur;
      if (k >= 1) return land();
      setSimT(k * sh.time);
      raf.current = requestAnimationFrame(step);
    };
    setSimT(0);
    raf.current = requestAnimationFrame(step);
  };

  const svgPoint = (e: ReactPointerEvent) => (svgRef.current ? toSvgPoint(svgRef.current, e.clientX, e.clientY) : { x: 0, y: 0 });

  const angleFrom = (x: number, y: number) =>
    clamp(Math.round((Math.atan2(groundY - y, Math.max(1, x - padL)) * 180) / Math.PI), ANGLE_MIN, ANGLE_MAX);

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phase !== 'aim') return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = svgPoint(e);
    const onKnob = round.freeAngle && Math.hypot(p.x - knob.x, p.y - knob.y) < 34;
    setPull({ mode: onKnob ? 'angle' : 'pull', sx: p.x, sy: p.y, x: p.x, y: p.y });
    if (!onKnob) setPower(0);
  };

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pull) return;
    const p = svgPoint(e);
    setPull({ ...pull, x: p.x, y: p.y });
    if (pull.mode === 'angle') setAngle(angleFrom(p.x, p.y));
    else setPower(clamp(Math.hypot(p.x - pull.sx, p.y - pull.sy) / maxPull, 0, 1));
  };

  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pull) return;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    const mode = pull.mode;
    setPull(null);
    if (mode === 'pull') {
      if (power >= 0.03) fire(power);
      else setPower(lastPower ?? 0);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (phase !== 'aim') return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowLeft') setPower((p) => clamp(p + (k === 'ArrowRight' ? 0.02 : -0.02), 0, 1));
    else if (round.freeAngle && (k === 'ArrowUp' || k === 'ArrowDown')) setAngle((a) => clamp(a + (k === 'ArrowUp' ? 1 : -1), ANGLE_MIN, ANGLE_MAX));
    else if ((k === 'Enter' || k === ' ') && power >= 0.03) fire(power);
    else return;
    e.preventDefault();
  };

  const next = () => {
    if (index + 1 >= ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        onFinish(score);
      }
      return;
    }
    cancelAnimationFrame(raf.current);
    setIndex(index + 1);
    setPhase('aim');
    setTries(0);
    setShot(null);
    setPrevShot(null);
    setHit(false);
    setMsg('');
    setPower(0);
    setLastPower(null);
  };

  const pts = (sh: Shot, upTo = Infinity) => flightPath(sh, TRAIL_N).filter((_, i) => (sh.time * i) / TRAIL_N <= upTo + 1e-9);
  const ghost = phase === 'done' && !hit ? flightPath(shoot(round, round.solution.power, round.solution.angle), TRAIL_N) : null;
  const trail = shot ? pts(shot, phase === 'flying' ? simT : Infinity) : [];
  const ballNow = shot ? positionAt(shot, phase === 'flying' ? simT : shot.time) : null;
  const step = niceStep(round.width);
  const ticks = Array.from({ length: Math.floor(round.width / step) + 1 }, (_, i) => i * step);
  const textFill = look.dark ? '#eef1ff' : C.ink;
  const meterW = Math.min(200, w * 0.38);
  // Narrow screens put the gravity readout on its own row under the power meter.
  const readoutY = w < 560 ? 70 : 33;
  const spring = 1 - power * 0.7;
  const triesLeft = MAX_TRIES - tries;

  let foot: string;
  if (phase === 'done') foot = explain(band, round);
  else if (msg) foot = msg;
  else foot = HOW[band];

  return (
    <div className="launch-lab">
      <div className="ll-hud">
        <p className="ll-goal">{GOALS[band]}</p>
        <div className="ll-stats">
          <button type="button" className="ll-icon" onClick={() => speak(`${GOALS[band]} ${HOW[band]}`, { force: true })} aria-label="Hear the goal">
            <Volume2 size={18} />
          </button>
          <span className="ll-pill" aria-label={`Target ${index + 1} of ${ROUNDS}`}>
            <Rocket size={15} /> {index + 1}/{ROUNDS}
          </span>
          <span className="ll-pill" aria-label={`${score} hits`}>
            <Star size={15} fill="var(--star)" /> {score}
          </span>
        </div>
      </div>

      <div className="ll-stage" ref={boxRef}>
        {w > 0 && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${w} ${h}`}
            className={`ll-svg${pull ? ' pulling' : ''}`}
            tabIndex={0}
            role="application"
            aria-label={`Launcher. Power ${Math.round(power * 100)} percent${round.freeAngle ? `, angle ${aim} degrees` : ''}. Arrow keys adjust, Enter launches.`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onKeyDown={onKey}
          >
            <defs>
              <linearGradient id="ll-sky" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={look.sky[0]} />
                <stop offset="1" stopColor={look.sky[1]} />
              </linearGradient>
            </defs>
            <rect x={0} y={0} width={w} height={h} fill="url(#ll-sky)" />
            {look.dark &&
              [0.12, 0.27, 0.41, 0.58, 0.69, 0.83, 0.93].map((fx, i) => (
                <circle key={i} cx={fx * w} cy={top * 0.4 + ((i * 53) % Math.max(40, groundY - top - 60))} r={i % 2 ? 1.6 : 2.4} fill="white" opacity={0.7} />
              ))}
            <rect x={0} y={groundY} width={w} height={h - groundY} fill={look.ground} />
            <line x1={0} x2={w} y1={groundY} y2={groundY} stroke={C.ink} strokeWidth={3} />

            {/* Ruler along the ground */}
            {ticks.map((m) => (
              <g key={m}>
                <line x1={X(m)} x2={X(m)} y1={groundY} y2={groundY + 8} stroke={C.ink} strokeWidth={2} />
                {band >= 2 && (
                  <text x={X(m)} y={groundY + 26} textAnchor="middle" className="ll-tick">
                    {m} m
                  </text>
                )}
              </g>
            ))}

            {/* Basket */}
            <g className={`ll-basket${hit ? ' hit' : ''}`}>
              <line x1={X(round.target)} x2={X(round.target)} y1={groundY} y2={groundY - 62} stroke={C.ink} strokeWidth={3} />
              <path d={`M${X(round.target)} ${groundY - 62} l26 8 l-26 8 Z`} fill={hit ? C.green : C.red} stroke={C.ink} strokeWidth={2} />
              <path
                d={`M${X(round.target - round.tol)} ${groundY - 20} L${X(round.target + round.tol)} ${groundY - 20} L${X(round.target + round.tol) - 6} ${groundY} L${X(round.target - round.tol) + 6} ${groundY} Z`}
                fill={hit ? C.green : C.purple}
                stroke={C.ink}
                strokeWidth={3}
                strokeLinejoin="round"
              />
            </g>

            {/* Wall */}
            {round.wall && (
              <g className="ll-wall">
                <rect
                  x={X(round.wall.x) - Math.max(10, round.wall.t * s) / 2}
                  y={Y(round.wall.h)}
                  width={Math.max(10, round.wall.t * s)}
                  height={round.wall.h * s}
                  fill={C.red}
                  stroke={C.ink}
                  strokeWidth={3}
                />
                {Array.from({ length: Math.floor((round.wall.h * s) / 16) }, (_, i) => (
                  <line
                    key={i}
                    x1={X(round.wall!.x) - Math.max(10, round.wall!.t * s) / 2}
                    x2={X(round.wall!.x) + Math.max(10, round.wall!.t * s) / 2}
                    y1={groundY - (i + 1) * 16}
                    y2={groundY - (i + 1) * 16}
                    stroke={C.ink}
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                ))}
              </g>
            )}

            {/* Trails: last one faint, ghost answer dashed, current one dotted */}
            {prevShot &&
              pts(prevShot).map((p, i) => <circle key={`p${i}`} cx={X(p.x)} cy={Y(p.y)} r={2.5} fill={textFill} opacity={0.22} />)}
            {ghost && (
              <polyline
                points={ghost.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}
                fill="none"
                stroke={C.green}
                strokeWidth={4}
                strokeDasharray="10 8"
                strokeLinecap="round"
                className="ll-ghost"
              />
            )}
            {trail.map((p, i) => (
              <circle key={`t${i}`} cx={X(p.x)} cy={Y(p.y)} r={3.5} fill={textFill} opacity={0.75} />
            ))}

            {/* Launcher */}
            {round.freeAngle && (
              // The knob's track: it turns between 15° and 75°.
              <path
                d={`M${arcPt(ANGLE_MIN)} A${knobR} ${knobR} 0 0 0 ${arcPt(ANGLE_MAX)}`}
                fill="none"
                stroke={textFill}
                strokeWidth={3}
                strokeDasharray="3 7"
                strokeLinecap="round"
                opacity={0.4}
              />
            )}
            <g transform={`translate(${padL} ${groundY}) scale(${u}) rotate(${-aim})`}>
              <rect x={-6} y={-13} width={BARREL + 6} height={26} rx={9} fill={C.blue} stroke={C.ink} strokeWidth={3} />
              <polyline
                points={Array.from({ length: 7 }, (_, i) => `${4 + i * ((BARREL - 18) * spring) / 6},${i % 2 ? -7 : 7}`).join(' ')}
                fill="none"
                stroke="white"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              {phase === 'aim' && <circle cx={4 + (BARREL - 18) * spring + 9} cy={0} r={9} fill={C.orange} stroke={C.ink} strokeWidth={2.5} />}
            </g>
            <path d={`M${padL - 26 * u} ${groundY} a${26 * u} ${26 * u} 0 0 1 ${52 * u} 0 Z`} fill={C.ink2} stroke={C.ink} strokeWidth={3} />

            {round.freeAngle && (
              <g className={`ll-knob${pull?.mode === 'angle' ? ' active' : ''}`} opacity={phase === 'flying' ? 0.45 : 1}>
                <circle cx={knob.x} cy={knob.y} r={30} fill="transparent" />
                <circle cx={knob.x} cy={knob.y} r={15} fill={C.yellow} stroke={C.ink} strokeWidth={3} />
                <circle cx={knob.x} cy={knob.y} r={4} fill={C.ink} />
                <text x={knob.x + 24} y={knob.y - 16} className="ll-angle" fill={textFill}>
                  {aim}°
                </text>
              </g>
            )}

            {/* The ball in flight */}
            {ballNow && <circle cx={X(ballNow.x)} cy={Y(ballNow.y)} r={9 * u} fill={C.orange} stroke={C.ink} strokeWidth={2.5} />}

            {/* Pull line while charging */}
            {pull?.mode === 'pull' && (
              <line x1={pull.sx} y1={pull.sy} x2={pull.x} y2={pull.y} stroke={textFill} strokeWidth={3} strokeDasharray="6 6" opacity={0.6} />
            )}

            {/* Power meter */}
            <g transform="translate(16 18)">
              <text x={0} y={15} className="ll-small" fill={textFill}>
                Power
              </text>
              <rect x={58} y={0} width={meterW} height={20} rx={10} fill="white" stroke={C.ink} strokeWidth={2.5} />
              <rect x={60} y={2} width={Math.max(0, (meterW - 4) * power)} height={16} rx={8} fill={C.red} />
              {lastPower !== null && (
                <line x1={60 + (meterW - 4) * lastPower} x2={60 + (meterW - 4) * lastPower} y1={-5} y2={25} stroke={C.ink} strokeWidth={2.5} />
              )}
              {band >= 2 && (
                <text x={66 + meterW} y={15} className="ll-small" fill={textFill}>
                  {Math.round(power * 100)}
                </text>
              )}
            </g>

            {/* Gravity readout, and how far the same launch would go on Earth */}
            {band === 3 && (
              <g>
                <text x={w - 16} y={readoutY} textAnchor="end" className="ll-planet" fill={textFill}>
                  {PLANETS[round.planet].name.replace('the ', '')} · g = {round.g} m/s²
                </text>
                {round.planet !== 'earth' && shot && phase !== 'flying' && (
                  <text x={w - 16} y={readoutY + 24} textAnchor="end" className="ll-small" fill={textFill}>
                    Same launch on Earth: {Math.round(earthRange(shot) * 10) / 10} m
                  </text>
                )}
              </g>
            )}
          </svg>
        )}
      </div>

      <div className="ll-foot" aria-live="polite">
        <span className="ll-tries" aria-label={`${triesLeft} tries left`}>
          {Array.from({ length: MAX_TRIES }, (_, i) => (
            <span key={i} className={i < tries ? (hit && i === tries - 1 ? 'good' : 'used') : ''} />
          ))}
        </span>
        <p className={`ll-msg${phase === 'done' ? ' end' : ''}`}>
          {phase === 'done' && (hit ? <strong>In the basket! </strong> : <strong>Out of tries. The dashed path works. </strong>)}
          {foot}
        </p>
        {phase === 'done' && (
          <button type="button" className="btn primary" onClick={next} autoFocus>
            {index + 1 >= ROUNDS ? 'Finish' : 'Next'} <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

export const game: Game = {
  id: 'launch-lab',
  subject: 'science',
  topic: 'physics',
  title: 'Launch Lab',
  blurb: 'Launch balls into baskets, even on the Moon.',
  howTo: 'Pull back and let go to launch the ball. More push sends it farther. Later, aim higher and try it on the Moon and Mars!',
  color: '#ff6b5b',
  icon: Rocket,
  scoreLabel: 'baskets hit',
  Play,
};
