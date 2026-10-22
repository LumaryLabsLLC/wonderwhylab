import { findLesson, useModule } from '../lessons';

/**
 * A lesson's little picture. It is drawn by the lesson's own code, so it appears once that has loaded
 * (which also gets the lesson ready to open).
 */
export function LessonThumb({ id }: { id: string }) {
  const hit = findLesson(id);
  const { module } = useModule(hit?.module.id);
  const Thumb = hit && module?.lessons[hit.index]?.Thumb;
  return Thumb ? <Thumb /> : null;
}
