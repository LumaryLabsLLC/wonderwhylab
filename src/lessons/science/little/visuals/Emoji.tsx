import { C } from '../../../../lib/color';
import { EMOJI_FONT } from '../../../../games/reading/words';

/** A big emoji picture with an optional caption, for question cards. */
export function EmojiPicture({ emoji, caption }: { emoji: string; caption?: string }) {
  return (
    <svg viewBox={caption ? '0 0 160 150' : '0 0 160 120'} role="img" aria-label={caption ?? emoji}>
      <text x={80} y={64} textAnchor="middle" dominantBaseline="central" fontSize={84} fontFamily={EMOJI_FONT}>
        {emoji}
      </text>
      {caption && (
        <text x={80} y={136} textAnchor="middle" fontSize={17} fontWeight={600} fill={C.ink}>
          {caption}
        </text>
      )}
    </svg>
  );
}

/** Emoji drawn inside a scene. */
export function SceneEmoji({ emoji, x, y, size = 48 }: { emoji: string; x: number; y: number; size?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontFamily={EMOJI_FONT}>
      {emoji}
    </text>
  );
}
