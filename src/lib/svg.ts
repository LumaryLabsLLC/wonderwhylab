import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface Pt {
  x: number;
  y: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const screenMaps = new WeakMap<SVGSVGElement, { key: string; toUser: DOMMatrix }>();

/**
 * The map from screen (client) pixels to an outermost SVG's user units.
 * Safari's getScreenCTM() ignores CSS scale and rotation on ancestors (the stage scales and turns the world),
 * so instead we see where three tiny marks at known points actually land on screen. Cached until the SVG moves.
 */
function screenToUser(root: SVGSVGElement): DOMMatrix {
  const box = root.getBoundingClientRect();
  const key = `${box.left},${box.top},${box.width},${box.height}`;
  const hit = screenMaps.get(root);
  if (hit && hit.key === key) return hit.toUser;
  const at = [
    [0, 0],
    [100, 0],
    [0, 100],
  ].map(([x, y]) => {
    const mark = document.createElementNS(SVG_NS, 'rect');
    mark.setAttribute('x', String(x));
    mark.setAttribute('y', String(y));
    mark.setAttribute('width', '0.01');
    mark.setAttribute('height', '0.01');
    mark.setAttribute('fill', 'none');
    root.appendChild(mark);
    const r = mark.getBoundingClientRect();
    mark.remove();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const toScreen = new DOMMatrix([
    (at[1].x - at[0].x) / 100,
    (at[1].y - at[0].y) / 100,
    (at[2].x - at[0].x) / 100,
    (at[2].y - at[0].y) / 100,
    at[0].x,
    at[0].y,
  ]);
  const toUser = toScreen.inverse();
  screenMaps.set(root, { key, toUser });
  return toUser;
}

/** Convert a pointer position to the coordinate space of an SVG (works through CSS transforms, in every browser). */
export function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Pt {
  let root = svg;
  while (root.ownerSVGElement) root = root.ownerSVGElement;
  let p = new DOMPoint(clientX, clientY).matrixTransform(screenToUser(root));
  if (root !== svg) {
    // A nested SVG: step from the outer SVG's units into its own. Both CTMs share the same ancestors,
    // so whatever a browser gets wrong above the outer SVG cancels out.
    const outer = root.getScreenCTM();
    const inner = svg.getScreenCTM();
    if (outer && inner) p = p.matrixTransform(outer.inverse().multiply(inner).inverse());
  }
  return { x: p.x, y: p.y };
}

function ownerSvg(el: Element): SVGSVGElement | null {
  if (el instanceof SVGSVGElement) return el.ownerSVGElement ?? el;
  return (el as SVGElement).ownerSVGElement ?? null;
}

/**
 * Make an SVG element draggable. `onMove` receives the pointer in SVG user units.
 * Spread the returned props onto the element. The stage will not pan while dragging it.
 *
 *   const drag = useSvgDrag((p) => setAngle(angleOf(p)));
 *   <circle {...drag} ... />
 */
export function useSvgDrag(
  onMove: (p: Pt) => void,
  opts: { onStart?: (p: Pt) => void; onEnd?: () => void } = {},
) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cb = useRef({ onMove, ...opts });
  cb.current = { onMove, ...opts };

  return {
    'data-nopan': true,
    style: { cursor: 'grab', touchAction: 'none' } as const,
    onPointerDown(e: ReactPointerEvent<SVGElement>) {
      const svg = ownerSvg(e.currentTarget);
      if (!svg) return;
      svgRef.current = svg;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.stopPropagation();
      const p = toSvgPoint(svg, e.clientX, e.clientY);
      cb.current.onStart?.(p);
      cb.current.onMove(p);
    },
    onPointerMove(e: ReactPointerEvent<SVGElement>) {
      if (!svgRef.current || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
      cb.current.onMove(toSvgPoint(svgRef.current, e.clientX, e.clientY));
    },
    onPointerUp(e: ReactPointerEvent<SVGElement>) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      svgRef.current = null;
      cb.current.onEnd?.();
    },
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
