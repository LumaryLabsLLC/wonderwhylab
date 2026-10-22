import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Maximize2, Minus, Plus, RotateCcw as RotateIcon, RotateCw, Scan, Tags, X } from 'lucide-react';
import { setSetting, useProgress } from '../lib/progress';
import { clamp } from '../lib/svg';

/** Every scene draws into this fixed world; the stage scales it to fit the screen. */
export const WORLD_W = 1000;
export const WORLD_H = 680;

interface StageContext {
  /** Element that callouts portal into (sits above the scene, inside the scaled world). */
  overlay: HTMLDivElement | null;
  labels: boolean;
}

const Ctx = createContext<StageContext>({ overlay: null, labels: true });
export const useStage = () => useContext(Ctx);

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface StageProps {
  children: ReactNode;
  /** Space reserved for floating panels around the stage. */
  insets: Insets;
  /** Where to place the toolbar, measured up from the bottom of the stage. */
  toolbarBottom: number;
  /** Mobile/tablet layout: page scrolls, so the wheel and one-finger drags must not be captured. */
  compact: boolean;
}

interface View {
  x: number;
  y: number;
  z: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const HOME: View = { x: 0, y: 0, z: 1 };
/** Room for the close button and toolbar when the playground fills the screen. */
const FULL_INSETS: Insets = { top: 12, right: 12, bottom: 64, left: 12 };
/** On a short, wide screen (a phone on its side) the toolbar moves to the right edge to save height. */
const FULL_INSETS_SIDE_BAR: Insets = { top: 12, right: 64, bottom: 12, left: 12 };
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
/** Below this scale the label cards are too small to read, so they are hidden. */
const LABEL_MIN_SCALE = 0.55;
const MIN_Z = 0.6;
const MAX_Z = 2.6;

/** The notch and home-indicator areas, which the full-screen playground must keep clear of. */
function readSafeArea(): Insets {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return out;
}

const addInsets = (a: Insets, b: Insets): Insets => ({ top: a.top + b.top, right: a.right + b.right, bottom: a.bottom + b.bottom, left: a.left + b.left });

/** How big the world can be drawn in a w × h box after insets. */
const fitIn = (w: number, h: number, i: Insets, frame: { w: number; h: number } = { w: WORLD_W, h: WORLD_H }) =>
  Math.min((w - i.left - i.right) / frame.w, (h - i.top - i.bottom) / frame.h);

export function Stage({ children, insets: pageInsets, toolbarBottom, compact: compactLayout }: StageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  // On small screens the playground can fill the whole screen, which makes everything bigger to tap.
  const [full, setFull] = useState(false);
  // In full screen the page no longer scrolls, so drags and the wheel can belong to the stage.
  const compact = compactLayout && !full;
  const [screenSize, setScreenSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const portrait = screenSize.h > screenSize.w;
  const [safe, setSafe] = useState<Insets>(NO_INSETS);
  // A phone held upright is too narrow for the wide playground, so full screen turns it sideways
  // (the child turns the phone to match). `null` means choose automatically.
  const [turnChoice, setTurnChoice] = useState<boolean | null>(null);
  // Full-screen room for a given way up. When the playground is turned, its left edge is the top of the
  // screen and its right edge the bottom (home indicator). A short, wide area puts the toolbar on the right edge.
  const fullLayout = (turn: boolean) => {
    const w = turn ? screenSize.h : screenSize.w;
    const h = turn ? screenSize.w : screenSize.h;
    const bar = w > h * 1.5 && h < 560;
    const edge = turn ? { top: 0, right: safe.bottom, bottom: 0, left: safe.top } : safe;
    return { w, h, bar, insets: addInsets(bar ? FULL_INSETS_SIDE_BAR : FULL_INSETS, edge) };
  };
  const upright = fullLayout(false);
  const sideways = fullLayout(true);
  const uprightFit = fitIn(upright.w, upright.h, upright.insets);
  const turnedFit = fitIn(sideways.w, sideways.h, sideways.insets);
  const turned = full && portrait && (turnChoice ?? (uprightFit < LABEL_MIN_SCALE && turnedFit > uprightFit * 1.2));
  const sideBar = full && (turned ? sideways : upright).bar;
  const insets = !full ? pageInsets : (turned ? sideways : upright).insets;
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>(HOME);
  const [panning, setPanning] = useState(false);
  const labels = useProgress((s) => s.settings.showLabels);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!full) return;
    const onResize = () => {
      setScreenSize({ w: window.innerWidth, h: window.innerHeight });
      setSafe(readSafeArea());
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      setTurnChoice(null);
    };
  }, [full]);

  // The "turn your phone" note shows briefly each time the playground turns sideways.
  const [turnHint, setTurnHint] = useState(false);
  useEffect(() => {
    if (!turned) return;
    setTurnHint(true);
    const t = window.setTimeout(() => setTurnHint(false), 5000);
    return () => window.clearTimeout(t);
  }, [turned]);

  useEffect(() => {
    if (!compactLayout) return;
    const onResize = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [compactLayout]);

  // Leave full screen if the layout grows back to desktop size.
  useEffect(() => {
    if (!compactLayout) setFull(false);
  }, [compactLayout]);

  // The area the scene actually draws in (its SVG bounding box). On small screens the stage zooms to it,
  // so it is measured again whenever the scene changes: cards and buttons that appear later must stay in view.
  // It only ever grows, so the view never jumps in on a child mid-task, and it waits until fingers lift.
  const [content, setContent] = useState<Box | null>(null);
  const rendered = size.w > 0;
  useLayoutEffect(() => {
    const root = rootRef.current;
    const svg = root?.querySelector<SVGSVGElement>('.world > svg');
    if (!rendered || !svg || !root) return;
    let pressed = false;
    let timer = 0;
    const measure = () => {
      timer = 0;
      if (pressed) return;
      let b: DOMRect;
      try {
        b = svg.getBBox();
      } catch {
        return;
      }
      if (b.width <= 0 || b.height <= 0) return;
      const pad = 16;
      const x = Math.max(0, Math.floor((b.x - pad) / 4) * 4);
      const y = Math.max(0, Math.floor((b.y - pad) / 4) * 4);
      const r = Math.min(WORLD_W, Math.ceil((b.x + b.width + pad) / 4) * 4);
      const bt = Math.min(WORLD_H, Math.ceil((b.y + b.height + pad) / 4) * 4);
      setContent((prev) => {
        if (prev && x >= prev.x && y >= prev.y && r <= prev.x + prev.w && bt <= prev.y + prev.h) return prev;
        if (!prev) return { x, y, w: r - x, h: bt - y };
        const nx = Math.min(prev.x, x);
        const ny = Math.min(prev.y, y);
        return { x: nx, y: ny, w: Math.max(prev.x + prev.w, r) - nx, h: Math.max(prev.y + prev.h, bt) - ny };
      });
    };
    measure();
    if (!compactLayout) return;
    const later = () => {
      if (!timer) timer = window.setTimeout(measure, 250);
    };
    const down = () => {
      pressed = true;
    };
    const up = () => {
      pressed = false;
      later();
    };
    const mo = new MutationObserver(later);
    mo.observe(svg, { subtree: true, childList: true, attributes: true, characterData: true });
    root.addEventListener('pointerdown', down, true);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      mo.disconnect();
      window.clearTimeout(timer);
      root.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [rendered, compactLayout]);

  const availW = Math.max(100, size.w - insets.left - insets.right);
  // In the page (not full screen) the stage sizes its own height to the scene, up to a limit,
  // so judge whether to zoom to the scene's drawing against that limit rather than the current height.
  // (A phone on its side is so short that the playground may take the whole height; the page scrolls to it.)
  const inlineMaxH = screenSize.h < 500 ? Math.max(260, screenSize.h - 16) : Math.round(screenSize.h * 0.72);
  const sizeToScene = compact;
  const availH = Math.max(100, (sizeToScene ? inlineMaxH : size.h) - insets.top - insets.bottom);
  const worldFit = Math.min(availW / WORLD_W, availH / WORLD_H);
  // When the whole world would be too small to read its labels (phones), zoom to the scene's own drawing instead.
  const tight = compactLayout && worldFit < LABEL_MIN_SCALE && content !== null && content.w > 50 && content.h > 50;
  const frame = tight ? content! : { x: 0, y: 0, w: WORLD_W, h: WORLD_H };
  // Inline height: just tall enough for the scene at full width, so a phone shows it as big as its width allows.
  const inlineH = sizeToScene
    ? Math.round(clamp((availW / frame.w) * frame.h + insets.top + insets.bottom, 260, inlineMaxH))
    : undefined;
  const drawH = Math.max(100, (inlineH ?? size.h) - insets.top - insets.bottom);
  const fit = clamp(Math.min(availW / frame.w, drawH / frame.h), 0.2, 1.5);
  const s = fit * view.z;
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  const baseX = insets.left + availW / 2;
  const baseY = insets.top + drawH / 2;
  const tx = baseX + view.x - cx * s;
  const ty = baseY + view.y - cy * s;

  // Keep the latest geometry in a ref so event handlers stay stable.
  const geo = useRef({ s, fit, tx, ty, baseX, baseY, cx, cy });
  geo.current = { s, fit, tx, ty, baseX, baseY, cx, cy };

  /** A pointer position in the stage's own (possibly turned) coordinates. */
  const turnedRef = useRef(turned);
  turnedRef.current = turned;
  const toLocal = useCallback((clientX: number, clientY: number) => {
    const r = rootRef.current!.getBoundingClientRect();
    return turnedRef.current ? { x: clientY - r.top, y: r.right - clientX } : { x: clientX - r.left, y: clientY - r.top };
  }, []);

  /** Zoom by `factor`, keeping the screen point (mx, my) fixed. */
  const zoomAt = useCallback((factor: number, mx?: number, my?: number) => {
    setView((v) => {
      const g = geo.current;
      const z = clamp(v.z * factor, MIN_Z, MAX_Z);
      const px = mx ?? g.baseX;
      const py = my ?? g.baseY;
      const wx = (px - g.tx) / g.s;
      const wy = (py - g.ty) / g.s;
      const s2 = g.fit * z;
      return { z, x: px - wx * s2 - g.baseX + g.cx * s2, y: py - wy * s2 - g.baseY + g.cy * s2 };
    });
  }, []);

  // Wheel zoom (needs a non-passive listener to stop the page from scrolling).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (compact && !e.ctrlKey) return;
      e.preventDefault();
      const p = toLocal(e.clientX, e.clientY);
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [compact, zoomAt, toLocal]);

  // Keyboard panning with WASD / arrow keys, like a game.
  useEffect(() => {
    if (compact) return;
    const onKey = (e: KeyboardEvent) => {
      // Synthetic events can target window, which has no closest().
      const t = e.target instanceof Element ? e.target : document.body;
      if (e.defaultPrevented || t.closest('input, textarea, select, [contenteditable], [role="dialog"], [data-nopan], [role="button"], [role="application"]') || e.metaKey || e.ctrlKey) return;
      const step = 40;
      const moves: Record<string, [number, number]> = {
        w: [0, step], arrowup: [0, step], s: [0, -step], arrowdown: [0, -step],
        a: [step, 0], arrowleft: [step, 0], d: [-step, 0], arrowright: [-step, 0],
      };
      const m = moves[e.key.toLowerCase()];
      if (!m) return;
      if (e.key.startsWith('Arrow') && t.closest('[role="tablist"], .rail')) return;
      e.preventDefault();
      setView((v) => ({ ...v, x: v.x + m[0], y: v.y + m[1] }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [compact]);

  // Drag to pan, pinch to zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ startX: number; startY: number; vx: number; vy: number; moved: boolean; allowPan: boolean; pinch?: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as Element).closest('[data-nopan], button, input, .stage-toolbar')) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { startX: 0, startY: 0, vx: view.x, vy: view.y, moved: true, allowPan: true, pinch: Math.hypot(a.x - b.x, a.y - b.y) };
    } else {
      // On small screens a one-finger drag scrolls the page, unless the learner has zoomed in.
      const allowPan = !(compact && e.pointerType === 'touch' && view.z <= 1.01);
      drag.current = { startX: e.clientX, startY: e.clientY, vx: view.x, vy: view.y, moved: false, allowPan };
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (d.pinch && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = toLocal((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAt(dist / d.pinch, mid.x, mid.y);
      d.pinch = dist;
      return;
    }
    if (!d.allowPan) return;
    const sx = e.clientX - d.startX;
    const sy = e.clientY - d.startY;
    const [dx, dy] = turned ? [sy, -sx] : [sx, sy];
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) {
      d.moved = true;
      setPanning(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };

  const endPointer = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      drag.current = null;
      setPanning(false);
    }
  };

  return (
    <Ctx.Provider value={{ overlay, labels: labels && !tight && s >= LABEL_MIN_SCALE }}>
      <div
        ref={rootRef}
        className={`stage${compact ? ' compact' : ''}${full ? ' fullscreen' : ''}${turned ? ' turned' : ''}${sideBar ? ' side-bar' : ''}${panning ? ' panning' : ''}`}
        style={compact ? { touchAction: view.z > 1.01 ? 'none' : 'pan-y', height: inlineH } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        {size.w > 0 && (
          <div
            className="world"
            style={{ width: WORLD_W, height: WORLD_H, transform: `translate(${tx}px, ${ty}px) scale(${s})` }}
          >
            {children}
            <div className="world-overlay" ref={setOverlay} />
          </div>
        )}
        {turned && turnHint && (
          <div className="stage-rotate-hint" role="status">
            <RotateIcon size={15} /> Turn your phone sideways
          </div>
        )}
        <div
          className="stage-toolbar"
          style={compactLayout ? undefined : { left: baseX, bottom: toolbarBottom }}
        >
          <div className="stage-buttons">
            <button type="button" className="zoom" onClick={() => zoomAt(1 / 1.25)} aria-label="Zoom out" title="Zoom out">
              <Minus size={16} />
            </button>
            <button type="button" className="zoom" onClick={() => zoomAt(1.25)} aria-label="Zoom in" title="Zoom in">
              <Plus size={16} />
            </button>
            <button type="button" onClick={() => setView(HOME)} aria-label="Reset view" title="Reset view">
              <Scan size={16} />
            </button>
            <span className="stage-sep" />
            <button
              type="button"
              className={labels ? 'on' : ''}
              onClick={() => setSetting('showLabels', !labels)}
              aria-pressed={labels}
              aria-label="Show labels"
              title={labels ? 'Hide labels' : 'Show labels'}
            >
              <Tags size={16} />
            </button>
            {compactLayout && (
              <>
                <span className="stage-sep" />
                {full && portrait && (
                  <button
                    type="button"
                    className={turned ? 'on' : ''}
                    onClick={() => setTurnChoice(!turned)}
                    aria-pressed={turned}
                    aria-label="Turn the playground sideways"
                    title={turned ? 'Show it upright' : 'Turn it sideways'}
                  >
                    <RotateCw size={16} />
                  </button>
                )}
                {full ? (
                  <button type="button" className="stage-full-btn" onClick={() => setFull(false)} aria-label="Close full screen">
                    <X size={16} /> Done
                  </button>
                ) : (
                  <button type="button" className="stage-full-btn" onClick={() => setFull(true)} aria-label="Open the playground full screen">
                    <Maximize2 size={15} /> Full screen
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}
