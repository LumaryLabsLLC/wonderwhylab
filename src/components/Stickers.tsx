import { Award, Brain, Crown, Footprints, Gamepad2, Gem, GraduationCap, HeartHandshake, Medal, Repeat, Rocket, Sparkles, Sprout, Star, Blocks, Compass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GAMES } from '../games';
import { ALL_LESSONS, MODULES } from '../lessons';
import { masteryOf } from '../lib/memory';
import type { ProgressState } from '../lib/progress';
import { useProgress } from '../lib/progress';
import { Modal } from './Modal';

interface Sticker {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  earned: (s: ProgressState) => boolean;
}

const totalStars = (s: ProgressState) => Object.values(s.stars).reduce((a, b) => a + b, 0);
const lessonsDone = (s: ProgressState) => Object.keys(s.stars).length;
const moduleIcons: Record<string, LucideIcon> = { tiny: Sprout, builders: Blocks, explorers: Compass, masters: Rocket };

export const STICKERS: Sticker[] = [
  { id: 'first', title: 'First steps', desc: 'Finish your first lesson', icon: Footprints, color: '#f5c542', earned: (s) => lessonsDone(s) >= 1 },
  { id: 'solver', title: 'Problem solver', desc: 'Get 25 answers right', icon: Brain, color: '#e46fa6', earned: (s) => s.solved >= 25 },
  { id: 'stars10', title: 'Star collector', desc: 'Collect 10 stars', icon: Star, color: '#f2994a', earned: (s) => totalStars(s) >= 10 },
  { id: 'perfect', title: 'Perfect five', desc: 'Get 3 stars on 5 lessons', icon: Sparkles, color: '#1aa39a', earned: (s) => Object.values(s.stars).filter((n) => n === 3).length >= 5 },
  { id: 'grit', title: 'Never give up', desc: 'Fix 10 answers after a first try', icon: HeartHandshake, color: '#ff5d8f', earned: (s) => s.comebacks >= 10 },
  { id: 'memory', title: 'Memory builder', desc: 'Finish 5 reviews', icon: Repeat, color: '#14b8a6', earned: (s) => s.reviewsDone >= 5 },
  { id: 'master5', title: 'Master of five', desc: 'Master 5 lessons', icon: GraduationCap, color: '#34c47c', earned: (s) => ALL_LESSONS.filter((l) => masteryOf(s.skills[l.id]) === 'mastered').length >= 5 },
  { id: 'games', title: 'Game on!', desc: 'Finish 5 game rounds', icon: Gamepad2, color: '#ff9f43', earned: (s) => s.gamesPlayed >= 5 },
  { id: 'explorer', title: 'Game explorer', desc: 'Play every game', icon: Compass, color: '#3d7fd6', earned: (s) => GAMES.every((g) => Object.keys(s.gameBest).some((k) => k.startsWith(`${g.id}:`))) },
  { id: 'machine', title: 'Math machine', desc: 'Get 100 answers right', icon: Medal, color: '#8b67d6', earned: (s) => s.solved >= 100 },
  ...MODULES.map<Sticker>((m) => ({
    id: `module-${m.id}`,
    title: m.title,
    desc: `Finish every ${m.ages.toLowerCase()} lesson`,
    icon: moduleIcons[m.id] ?? Award,
    color: m.color,
    earned: (s) => m.lessons.length > 0 && m.lessons.every((l) => s.stars[l.id]),
  })),
  { id: 'stars50', title: 'Super star', desc: 'Collect 50 stars', icon: Gem, color: '#e8604c', earned: (s) => totalStars(s) >= 50 },
  { id: 'all', title: 'Champion', desc: 'Finish every lesson', icon: Crown, color: '#f5b82e', earned: (s) => MODULES.every((m) => m.lessons.length > 0 && m.lessons.every((l) => s.stars[l.id])) },
];

function Badge({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <svg width={86} height={86} viewBox="0 0 86 86" aria-hidden>
      <circle cx={43} cy={46} r={36} fill="#1e2b4a" opacity={0.14} />
      <path
        d={Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r = i % 2 ? 36 : 40;
          return `${i ? 'L' : 'M'}${43 + Math.cos(a) * r},${43 + Math.sin(a) * r}`;
        }).join(' ') + 'Z'}
        fill={color}
        stroke="#1e2b4a"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={43} cy={43} r={26} fill="#f9f4e9" stroke="#1e2b4a" strokeWidth={2} />
      <Icon x={27} y={27} size={32} strokeWidth={1.8} color="#1e2b4a" />
    </svg>
  );
}

export function Stickers({ onClose }: { onClose: () => void }) {
  const state = useProgress((s) => s);
  const earned = STICKERS.filter((st) => st.earned(state)).length;
  return (
    <Modal title="Sticker book" subtitle={`You have ${earned} of ${STICKERS.length} stickers. Finish lessons to earn more!`} onClose={onClose}>
      <div className="stickers">
        {STICKERS.map((st) => {
          const got = st.earned(state);
          return (
            <div key={st.id} className={`sticker${got ? '' : ' locked'}`}>
              <Badge icon={st.icon} color={st.color} />
              <div className="t">{st.title}</div>
              <div className="d">{got ? 'Earned!' : st.desc}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
