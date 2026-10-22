import { BookHeart, BookOpen, Bot, Calculator, FlaskConical, Gamepad2, Globe, HeartHandshake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Subject } from './lessons/types';

/** Everything the home screen can open: a lesson subject, the story library, or the games. */
export type SubjectId = Subject;
export type HomeTileId = Subject | 'stories' | 'games';

export interface SubjectInfo {
  id: HomeTileId;
  title: string;
  icon: LucideIcon;
  color: string;
  soft: string;
}

export const HOME_TILES: SubjectInfo[] = [
  { id: 'math', title: 'Math', icon: Calculator, color: '#3b8cff', soft: '#dde9ff' },
  { id: 'reading', title: 'Reading & Writing', icon: BookOpen, color: '#ff6b5b', soft: '#ffe3df' },
  { id: 'science', title: 'Science', icon: FlaskConical, color: '#14b8a6', soft: '#d5f5ef' },
  { id: 'stories', title: 'Stories', icon: BookHeart, color: '#f59e0b', soft: '#fef0cf' },
  { id: 'coding', title: 'Coding', icon: Bot, color: '#5b6cff', soft: '#e3e6ff' },
  { id: 'world', title: 'World', icon: Globe, color: '#1f9e8f', soft: '#d4f1ec' },
  { id: 'life', title: 'Life Skills', icon: HeartHandshake, color: '#ec4899', soft: '#fde1ef' },
  { id: 'games', title: 'Games', icon: Gamepad2, color: '#8b5cf6', soft: '#ece4ff' },
];

export const SUBJECT_TITLES: Record<HomeTileId, string> = Object.fromEntries(HOME_TILES.map((t) => [t.id, t.title])) as Record<
  HomeTileId,
  string
>;
