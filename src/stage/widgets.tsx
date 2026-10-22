import type { ReactNode } from 'react';
import { C, shade } from '../lib/color';
import { play } from '../lib/sound';

/**
 * Chunky, pressable button drawn in SVG, for controls that live inside a scene.
 * (x, y) is the top-left corner.
 */
export function SvgButton({
  x,
  y,
  w = 64,
  h = 56,
  label,
  onClick,
  color = C.card,
  textColor = C.ink,
  disabled = false,
  active = false,
  title,
  fontSize = 26,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: ReactNode;
  onClick: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  fontSize?: number;
}) {
  const depth = active ? 2 : 5;
  return (
    <g
      className={`svg-btn${disabled ? ' disabled' : ''}`}
      role="button"
      aria-label={title ?? (typeof label === 'string' ? label : undefined)}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (disabled) return;
        play('tap');
        onClick();
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          play('tap');
          onClick();
        }
      }}
      data-nopan
    >
      {title && <title>{title}</title>}
      <rect x={x} y={y + 5} width={w} height={h} rx={12} fill={shade(color, -0.28)} stroke={C.ink} strokeWidth={2} />
      <g className="svg-btn-face" transform={`translate(0 ${5 - depth})`}>
        <rect x={x} y={y} width={w} height={h} rx={12} fill={active ? shade(color, -0.08) : color} stroke={C.ink} strokeWidth={2} />
        <text
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight={700}
          fill={textColor}
          className="svg-btn-label"
        >
          {label}
        </text>
      </g>
    </g>
  );
}

/** A big number readout card, e.g. the running count in a counting scene. */
export function NumberCard({
  x,
  y,
  value,
  caption,
  w = 150,
  h = 120,
  color = C.ink,
}: {
  x: number;
  y: number;
  value: ReactNode;
  caption?: string;
  w?: number;
  h?: number;
  color?: string;
}) {
  return (
    <g>
      <rect x={x + 4} y={y + 6} width={w} height={h} rx={14} fill={shade(C.paper, -0.12)} />
      <rect x={x} y={y} width={w} height={h} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2} />
      <text
        x={x + w / 2}
        y={y + (caption ? h * 0.46 : h / 2)}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={h * 0.5}
        fontWeight={700}
        fill={color}
        className="num"
      >
        {value}
      </text>
      {caption && (
        <text x={x + w / 2} y={y + h - 18} textAnchor="middle" fontSize={15} fill={C.muted} className="caps">
          {caption}
        </text>
      )}
    </g>
  );
}

/** Soft elliptical shadow to ground objects on the paper. */
export function Shadow({ cx, cy, rx, ry, opacity = 0.18 }: { cx: number; cy: number; rx: number; ry: number; opacity?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={C.ink} opacity={opacity} />;
}

/** Standard full-size scene canvas. Put scene content inside. */
export function SceneSvg({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg className="scene" width={1000} height={680} viewBox="0 0 1000 680" role="group" aria-label={label}>
      {children}
    </svg>
  );
}
