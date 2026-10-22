/**
 * Spaced repetition for lessons (a Leitner system).
 *
 * Research basis: practice testing and distributed (spaced) practice are the two learning
 * techniques with the strongest evidence (Dunlosky et al., 2013). Each lesson sits in a "box";
 * finishing a lesson puts it in box 1, and every successful review moves it up a box and
 * waits longer before the next review. A slip moves it down so it comes back sooner.
 */

export interface SkillMemory {
  /** 0 = still learning, 1–5 = reviewing at growing gaps. */
  box: number;
  /** When the next review is due (ms since epoch). */
  due: number;
  /** Difficulty level the child last reached (0–2), so practice resumes at the right challenge. */
  level: number;
  /** Questions answered, and how many were right on the first try. */
  attempts: number;
  firstTry: number;
  /** Last time this skill was practised (ms). */
  last: number;
}

const DAY = 24 * 60 * 60 * 1000;
/** Days to wait before the next review, by box. */
export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
export const MAX_BOX = INTERVAL_DAYS.length - 1;
/** A skill counts as mastered once it has survived reviews up to this box. */
export const MASTERED_BOX = 3;

export function emptySkill(now: number): SkillMemory {
  return { box: 0, due: now, level: 0, attempts: 0, firstTry: 0, last: now };
}

/** Record one practice answer. */
export function recordAnswer(skill: SkillMemory | undefined, firstTry: boolean, level: number, now: number): SkillMemory {
  const s = skill ?? emptySkill(now);
  return { ...s, attempts: s.attempts + 1, firstTry: s.firstTry + (firstTry ? 1 : 0), level, last: now };
}

/** The lesson was completed: start reviewing it tomorrow (never pushes an existing schedule back). */
export function completeLesson(skill: SkillMemory | undefined, now: number): SkillMemory {
  const s = skill ?? emptySkill(now);
  if (s.box >= 1) return { ...s, last: now };
  return { ...s, box: 1, due: now + INTERVAL_DAYS[1] * DAY, last: now };
}

/** A review of this lesson finished. All first-try right → wait longer; any slip → come back sooner. */
export function reviewResult(skill: SkillMemory | undefined, allRight: boolean, now: number): SkillMemory {
  const s = skill ?? emptySkill(now);
  const box = allRight ? Math.min(MAX_BOX, Math.max(1, s.box) + 1) : Math.max(1, s.box - 1);
  return { ...s, box, due: now + INTERVAL_DAYS[box] * DAY, last: now };
}

export function isDue(skill: SkillMemory | undefined, now: number): boolean {
  return !!skill && skill.box >= 1 && skill.due <= now;
}

export type Mastery = 'new' | 'learning' | 'practising' | 'mastered';

export function masteryOf(skill: SkillMemory | undefined): Mastery {
  if (!skill || skill.attempts === 0) return 'new';
  if (skill.box >= MASTERED_BOX) return 'mastered';
  if (skill.box >= 1) return 'practising';
  return 'learning';
}

export const MASTERY_LABEL: Record<Mastery, string> = {
  new: 'Not started',
  learning: 'Learning',
  practising: 'Practising',
  mastered: 'Mastered',
};

/**
 * Adaptive difficulty: a "3 up, 1 down" staircase. Three first-try answers in a row raise the level,
 * any slip lowers it. This settles where a child gets roughly 80% right first time —
 * challenging but rarely frustrating (cf. the "85% rule", Wilson et al., 2019).
 */
export function nextLevel(level: number, streak: number, firstTry: boolean): { level: number; streak: number } {
  if (!firstTry) return { level: Math.max(0, level - 1), streak: 0 };
  if (streak + 1 >= 3) return { level: Math.min(2, level + 1), streak: 0 };
  return { level, streak: streak + 1 };
}

/**
 * Interleave review questions: each due lesson appears `perLesson` times. Every round is shuffled
 * on its own, and a round never starts with the lesson that ended the previous one, so the same
 * lesson never comes twice in a row (interleaved practice; Rohrer et al.).
 */
export function interleave<T>(items: T[], perLesson: number, random = Math.random): T[] {
  const out: T[] = [];
  for (let r = 0; r < perLesson; r++) {
    const round = [...items];
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [round[i], round[j]] = [round[j], round[i]];
    }
    if (round.length > 1 && round[0] === out[out.length - 1]) [round[0], round[1]] = [round[1], round[0]];
    out.push(...round);
  }
  return out;
}
