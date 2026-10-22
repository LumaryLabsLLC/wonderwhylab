import { Volume2 } from 'lucide-react';
import { canSpeak, speak } from '../../lib/speech';

export function ReadAloud({ text, label = 'Hear the goal' }: { text: string; label?: string }) {
  if (!canSpeak()) return null;
  return (
    <button type="button" className="icon-btn game-say" aria-label={label} title={label} onClick={() => speak(text, { force: true })}>
      <Volume2 size={17} />
    </button>
  );
}
